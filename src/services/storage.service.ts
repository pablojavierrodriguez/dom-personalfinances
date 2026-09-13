import { supabase } from "@/integrations/supabase/client";

export async function uploadReceipt(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("receipts")
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteReceipt(urlOrPath: string): Promise<void> {
  const parts = urlOrPath.split("/receipts/");
  const filePath = parts[1] || urlOrPath;

  const { error } = await supabase.storage.from("receipts").remove([filePath]);
  if (error) console.error("Error al borrar recibo:", error);
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El archivo excede el tamaño máximo permitido (5MB)");
  }

  // Validate mime type
  const allowedMime = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMime.includes(file.type)) {
    throw new Error("Formato no soportado. Debe ser JPEG, PNG o WebP");
  }

  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteAvatar(urlOrPath: string): Promise<void> {
  const parts = urlOrPath.split("/avatars/");
  const filePath = parts[1] || urlOrPath;

  const { error } = await supabase.storage.from("avatars").remove([filePath]);
  if (error) console.error("Error al borrar avatar:", error);
}

