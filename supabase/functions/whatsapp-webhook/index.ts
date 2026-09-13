// @ts-nocheck
// Supabase Deno Edge Function
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// @ts-ignore: URL import de Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: URL import de Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendWhatsAppTextMessage } from "./whatsapp-client.ts";
import { parseFinancialMessageHeuristic, parseFinancialMessageWithGemini } from "./parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Manejo de CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1. Verificación del Webhook de Meta Cloud API (GET handshake)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (!expectedToken) {
      console.error("❌ Variable de entorno WHATSAPP_VERIFY_TOKEN no configurada en Supabase Edge Functions");
      return new Response("Webhook verification token not configured", { status: 500 });
    }

    if (mode === "subscribe" && token === expectedToken) {
      console.log("✅ Webhook de WhatsApp verificado con éxito");
      return new Response(challenge, { status: 200 });
    } else {
      console.error("❌ Fallo en la verificación del webhook de WhatsApp (token mismatch o modo inválido)");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 2. Recepción de mensajes (POST)
  if (req.method === "POST") {
    try {
      const payload = await req.json();

      // Meta Cloud API entrega los mensajes dentro de entry[0].changes[0].value.messages
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];

      if (!message) {
        // Puede ser una notificación de lectura o estado de entrega (sent, delivered, read)
        return new Response(JSON.stringify({ status: "ignored_non_message_event" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const senderPhone = message.from; // Número en formato E.164 sin signos (ej. "5491112345678")
      const messageId = message.id;
      const messageType = message.type; // 'text', 'image', 'audio', etc.
      const textContent = message.text?.body?.trim() || "";

      // Variables de entorno de Supabase
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const whatsappAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
      const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || change?.metadata?.phone_number_id || "";
      const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // 3. Buscar integración del usuario por número de teléfono
      const { data: integration, error: intError } = await supabase
        .from("whatsapp_integrations")
        .select("id, user_id, phone_number, is_verified, verification_otp, otp_expires_at, default_account_id, default_currency, is_active")
        .or(`phone_number.ilike.%${senderPhone}%,phone_number.ilike.%${senderPhone.slice(-8)}%`)
        .eq("is_active", true)
        .maybeSingle();

      // Si no existe la integración para este número
      if (intError || !integration) {
        if (whatsappAccessToken && whatsappPhoneId) {
          await sendWhatsAppTextMessage(
            whatsappPhoneId,
            whatsappAccessToken,
            senderPhone,
            "👋 ¡Hola! Soy el asistente financiero de *DOMINUS*.\n\nTu número no está vinculado a ninguna cuenta. Por favor ingresá a la app, abrí *Ajustes* ⚙️ y seleccioná *Integración con WhatsApp* para vincular tu teléfono."
          );
        }
        return new Response(JSON.stringify({ status: "unregistered_sender" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = integration.user_id;

      // 4. Flujo de verificación OTP
      if (!integration.is_verified) {
        const inputOtp = textContent.replace(/\D/g, "");
        const isOtpValid =
          integration.verification_otp &&
          integration.verification_otp === inputOtp &&
          (!integration.otp_expires_at || new Date(integration.otp_expires_at) > new Date());

        if (isOtpValid) {
          await supabase
            .from("whatsapp_integrations")
            .update({
              is_verified: true,
              verification_otp: null,
              otp_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", integration.id);

          if (whatsappAccessToken && whatsappPhoneId) {
            await sendWhatsAppTextMessage(
              whatsappPhoneId,
              whatsappAccessToken,
              senderPhone,
              "🎉 *¡Teléfono verificado con éxito!*\n\nYa podés empezar a enviarme tus gastos cotidianos, por ejemplo:\n• _Gasté 15400 en Coto con Galicia_\n• _Pago farmacia 8200 efectivo_\n• _Cena 24000 en 3 cuotas_\n\nO enviarme una foto de cualquier ticket de compra 🧾."
            );
          }

          return new Response(JSON.stringify({ status: "verified" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          if (whatsappAccessToken && whatsappPhoneId) {
            await sendWhatsAppTextMessage(
              whatsappPhoneId,
              whatsappAccessToken,
              senderPhone,
              "⚠️ El código de verificación es incorrecto o ha expirado. Por favor generá uno nuevo desde la sección de Ajustes en DOMINUS."
            );
          }
          return new Response(JSON.stringify({ status: "invalid_otp" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // 5. Ingesta de Gasto / Transacción
      let extractedData = null;

      if (messageType === "text" && textContent) {
        if (geminiApiKey) {
          extractedData = await parseFinancialMessageWithGemini(geminiApiKey, textContent);
        } else {
          extractedData = parseFinancialMessageHeuristic(textContent);
        }
      } else if (messageType === "image") {
        // En caso de imagen, notificar recepción
        if (whatsappAccessToken && whatsappPhoneId) {
          await sendWhatsAppTextMessage(
            whatsappPhoneId,
            whatsappAccessToken,
            senderPhone,
            "🧾 ¡Ticket recibido! Estamos procesando la imagen de tu comprobante..."
          );
        }
        // Fallback básico para tickets si no hay visión configurada
        extractedData = {
          amount: 0,
          currency: "ARS" as const,
          description: "Ticket / Comprobante adjunto",
          categoryHint: "Supermercado",
          type: "expense" as const,
          date: new Date().toISOString(),
          confidence: 0.7,
        };
      }

      if (!extractedData || extractedData.amount <= 0) {
        if (whatsappAccessToken && whatsappPhoneId) {
          await sendWhatsAppTextMessage(
            whatsappPhoneId,
            whatsappAccessToken,
            senderPhone,
            "🤔 No pude identificar el monto del gasto en tu mensaje.\nProbá enviando algo como: *\"Gasté 12500 en súper con Santander\"*."
          );
        }
        return new Response(JSON.stringify({ status: "unrecognized_format" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 6. Consultar Cuentas y Categorías del usuario para conciliación
      const [{ data: accounts }, { data: categories }] = await Promise.all([
        supabase.from("accounts").select("id, name, type, balance").eq("user_id", userId),
        supabase.from("categories").select("id, name, type").eq("user_id", userId),
      ]);

      // Mapear categoría
      const userCategories = (categories as { id: string; name: string; type: string }[]) || [];
      const matchedCat = userCategories.find((c: { name: string }) =>
        c.name.toLowerCase().includes(extractedData!.categoryHint.toLowerCase())
      ) || userCategories.find((c: { type: string }) => c.type === extractedData!.type) || userCategories[0];

      // Mapear cuenta
      const userAccounts = (accounts as { id: string; name: string; balance?: number }[]) || [];
      let matchedAcc = null;
      if (extractedData.accountHint) {
        matchedAcc = userAccounts.find((a: { name: string }) =>
          a.name.toLowerCase().includes(extractedData!.accountHint!.toLowerCase())
        );
      }
      if (!matchedAcc) {
        matchedAcc = userAccounts.find((a: { id: string }) => a.id === integration.default_account_id) || userAccounts[0];
      }

      if (!matchedAcc) {
        throw new Error("El usuario no tiene cuentas configuradas en m3.");
      }

      // 7. Persistir en public.transactions
      const { data: newTx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          amount: extractedData.amount,
          description: extractedData.description,
          type: extractedData.type,
          category_id: matchedCat?.id || null,
          account_id: matchedAcc.id,
          date: extractedData.date,
          origin: "whatsapp_bot",
          external_reference: messageId,
        })
        .select("id")
        .single();

      if (txError) throw txError;

      // Actualizar saldo de la cuenta
      const balanceDelta = extractedData.type === "expense" ? -extractedData.amount : extractedData.amount;
      await supabase
        .from("accounts")
        .update({ balance: (matchedAcc.balance || 0) + balanceDelta })
        .eq("id", matchedAcc.id);

      // 8. Auditar en public.whatsapp_messages
      await supabase.from("whatsapp_messages").insert({
        user_id: userId,
        whatsapp_message_id: messageId,
        direction: "inbound",
        message_type: messageType,
        text_content: textContent,
        parsed_data: extractedData,
        confidence_score: extractedData.confidence,
        status: "processed",
        transaction_id: newTx?.id,
      });

      // 9. Enviar confirmación al usuario por WhatsApp
      if (whatsappAccessToken && whatsappPhoneId) {
        const sign = extractedData.type === "expense" ? "-" : "+";
        const formattedAmount = `$${extractedData.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
        const replyText = `✅ *Movimiento registrado*\n\n💵 Monto: *${sign}${formattedAmount}*\n🏷️ Detalle: *${extractedData.description}*\n📂 Categoría: *${matchedCat?.name || "General"}*\n💳 Cuenta: *${matchedAcc.name}*`;

        await sendWhatsAppTextMessage(whatsappPhoneId, whatsappAccessToken, senderPhone, replyText);
      }

      return new Response(JSON.stringify({ success: true, transactionId: newTx?.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Error en whatsapp-webhook handler:", err);
      return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
