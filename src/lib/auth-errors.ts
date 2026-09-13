/**
 * Utilidades para humanizar errores de autenticación y conexión con Supabase.
 */

export function isLocalEnvironment(): boolean {
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    (import.meta.env as any)?.SUPABASE_URL ||
    "";

  // Verifica si corre en localhost o si la URL configurada de Supabase apunta a loopback local
  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local"));

  const isLocalBackend =
    supabaseUrl.includes("localhost") ||
    supabaseUrl.includes("127.0.0.1") ||
    supabaseUrl.includes("0.0.0.0");

  return isLocalHost || isLocalBackend;
}

export function isNetworkOrConnectionError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.toString() || "").toLowerCase();
  const name = (error.name || "").toLowerCase();

  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("connection refused") ||
    msg.includes("load resource") ||
    msg.includes("err_connection_refused") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    name.includes("authretryablefetcherror") ||
    name.includes("timeouterror") ||
    name.includes("aborterror") ||
    error.status === 0
  );
}

export function getHumanAuthErrorMessage(error: any): {
  title: string;
  description: string;
  isConnectionError: boolean;
} {
  if (!error) {
    return {
      title: "Error inesperado",
      description: "Ocurrió un error. Por favor intentá nuevamente.",
      isConnectionError: false,
    };
  }

  const rawMsg = [
    error.message,
    error.error_description,
    error.errorDescription,
    error.error_code,
    error.errorCode,
    error.error,
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .join(" ") || (typeof error?.toString === "function" ? error.toString() : "");
  const lower = rawMsg.toLowerCase();

  // Caso 1: Error de conexión o servidor caído
  if (isNetworkOrConnectionError(error)) {
    const isLocal = isLocalEnvironment();
    return {
      title: "Sin conexión con el servidor",
      description: isLocal
        ? "No se pudo conectar con la base de datos local. Verificá que Supabase esté iniciado ejecutando 'supabase start' o que Docker esté corriendo."
        : "No pudimos conectar con los servidores de DOM. Verificá tu conexión a internet o reintentá en unos momentos.",
      isConnectionError: true,
    };
  }

  // Caso 2: Credenciales inválidas
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("invalid username or password")
  ) {
    return {
      title: "Credenciales incorrectas",
      description: "El email o la contraseña ingresados no son correctos. Verificalos e intentá nuevamente.",
      isConnectionError: false,
    };
  }

  // Caso 3: Email no confirmado
  if (lower.includes("email not confirmed")) {
    return {
      title: "Email no confirmado",
      description: "Tu cuenta aún no fue confirmada. Revisá el enlace de verificación en tu bandeja de entrada o spam.",
      isConnectionError: false,
    };
  }

  // Caso 4: Usuario ya registrado
  if (
    lower.includes("user already registered") ||
    lower.includes("already registered")
  ) {
    return {
      title: "Usuario ya registrado",
      description: "Ya existe una cuenta con este correo electrónico. Probá iniciar sesión.",
      isConnectionError: false,
    };
  }

  // Caso 5: Contraseña muy corta
  if (
    lower.includes("password should be at least") ||
    lower.includes("weak password")
  ) {
    return {
      title: "Contraseña muy débil",
      description: "La contraseña debe tener al minímo 6 caracteres.",
      isConnectionError: false,
    };
  }

  // Caso 6: Rate limit / demasiados intentos
  if (
    lower.includes("rate limit") ||
    lower.includes("over_request_rate_limit") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  ) {
    return {
      title: "Demasiados intentos",
      description: "Por seguridad se bloquearon temporalmente los intentos. Aguardá unos instantes antes de volver a probar.",
      isConnectionError: false,
    };
  }

  // Caso 7: Enlace de email inválido o expirado
  if (
    lower.includes("otp_expired") ||
    lower.includes("email link is invalid") ||
    lower.includes("link is invalid") ||
    lower.includes("has expired") ||
    lower.includes("token has expired")
  ) {
    return {
      title: "Enlace expirado o inválido",
      description: "El enlace de verificación o recuperación ya fue utilizado o venció. Por favor solicitá uno nuevo.",
      isConnectionError: false,
    };
  }

  // Caso 8: Acceso denegado en callback
  if (lower.includes("access_denied") || lower.includes("access denied")) {
    return {
      title: "Acceso denegado",
      description: "No se pudo validar el enlace de autenticación. Por favor solicitá un nuevo acceso.",
      isConnectionError: false,
    };
  }

  // Default amigable
  return {
    title: "No se pudo completar la operación",
    description: rawMsg || "Ocurrió un inconveniente al procesar tu solicitud. Por favor intentá de nuevo.",
    isConnectionError: false,
  };
}

export interface AuthUrlError {
  errorCode?: string;
  errorDescription?: string;
}

/**
 * Extrae posibles errores de autenticación devueltos en el hash (#error=...) o querystring (?error=...)
 * por Supabase Auth al redirigir al frontend.
 */
export function extractAuthUrlError(): AuthUrlError | null {
  if (typeof window === "undefined") return null;

  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const rawSearch = window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : window.location.search;

  // Priorizar hash (formato típico de Supabase implicit flow), luego search (PKCE / SSR)
  const targetStr = rawHash.includes("error")
    ? rawHash
    : rawSearch.includes("error")
    ? rawSearch
    : "";

  if (!targetStr) return null;

  try {
    const params = new URLSearchParams(targetStr);
    const error = params.get("error");
    const errorCode = params.get("error_code") || error || undefined;
    const rawDesc = params.get("error_description");
    const errorDescription = rawDesc
      ? decodeURIComponent(rawDesc.replace(/\+/g, " "))
      : undefined;

    if (error || errorCode || errorDescription) {
      return { errorCode, errorDescription };
    }
  } catch {
    // Si la cadena no es parseable como URLSearchParams, ignorar de forma segura
  }

  return null;
}

