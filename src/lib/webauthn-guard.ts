/**
 * WebAuthn Biometric Guard - DOMINUS
 * Módulo de soporte para autenticación biométrica local de plataforma (Touch ID, Face ID, Android Biometrics, Windows Hello).
 */

const CREDENTIAL_STORAGE_KEY = "dom-biometric-credential-id";
const LEGACY_CREDENTIAL_STORAGE_KEY = "impero-biometric-credential-id";

/**
 * Verifica si el dispositivo y navegador actual soportan autenticación biométrica de plataforma.
 */
export async function checkBiometricsSupport(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  if (!window.PublicKeyCredential) return false;

  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (err) {
    console.warn("Error checking platform authenticator availability:", err);
    return false;
  }
}

/**
 * Registra una credencial biométrica en el dispositivo del usuario.
 */
export async function registerBiometricCredential(userEmail: string = "usuario@dom.app"): Promise<string> {
  if (!navigator.credentials) {
    throw new Error("La API WebAuthn (credentials) no está disponible en este entorno.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "DOM Finanzas",
      },
      user: {
        id: userId,
        name: userEmail,
        displayName: userEmail.split("@")[0] || "Usuario DOM",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },  // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("No se pudo registrar la credencial biométrica.");
  }

  // Convertir rawId a string Base64 para almacenar
  const rawIdBytes = new Uint8Array(credential.rawId);
  let binary = "";
  for (let i = 0; i < rawIdBytes.byteLength; i++) {
    binary += String.fromCharCode(rawIdBytes[i]);
  }
  const base64Id = btoa(binary);

  localStorage.setItem(CREDENTIAL_STORAGE_KEY, base64Id);
  return base64Id;
}

/**
 * Solicita verificación biométrica mediante el hardware del dispositivo.
 */
export async function verifyBiometricCredential(): Promise<boolean> {
  if (!navigator.credentials) return false;

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const storedCredId = localStorage.getItem(CREDENTIAL_STORAGE_KEY) ?? localStorage.getItem(LEGACY_CREDENTIAL_STORAGE_KEY);

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: "required",
  };

  if (storedCredId) {
    try {
      const binary = atob(storedCredId);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      options.allowCredentials = [
        {
          id: bytes,
          type: "public-key",
        },
      ];
    } catch (err) {
      console.warn("Could not decode stored credential ID:", err);
    }
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: options,
    });
    return Boolean(assertion);
  } catch (err) {
    console.warn("Biometric verification rejected or cancelled by user:", err);
    return false;
  }
}

/**
 * Comprueba si ya existe una credencial biométrica registrada localmente.
 */
export function hasBiometricCredential(): boolean {
  try {
    return Boolean(localStorage.getItem(CREDENTIAL_STORAGE_KEY) ?? localStorage.getItem(LEGACY_CREDENTIAL_STORAGE_KEY));
  } catch {
    return false;
  }
}

/**
 * Elimina la credencial biométrica registrada.
 */
export function clearBiometricCredential(): void {
  try {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
    localStorage.removeItem(LEGACY_CREDENTIAL_STORAGE_KEY);
  } catch {}
}
