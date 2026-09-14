import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getHumanAuthErrorMessage,
  extractAuthUrlError,
  isNetworkOrConnectionError,
} from "@/lib/auth-errors";

describe("auth-errors unit tests", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hash: "",
      search: "",
      pathname: "/reset-password",
      hostname: "localhost",
    } as any;
  });

  afterEach(() => {
    window.location = originalLocation as any;
  });

  describe("getHumanAuthErrorMessage", () => {
    it("should humanize otp_expired and invalid email link errors", () => {
      const res = getHumanAuthErrorMessage({
        error_code: "otp_expired",
        error_description: "Email link is invalid or has expired",
      });

      expect(res.title).toBe("Enlace expirado o inválido");
      expect(res.description).toContain("ya fue utilizado o venció");
      expect(res.isConnectionError).toBe(false);
    });

    it("should humanize 429 rate limit errors", () => {
      const res = getHumanAuthErrorMessage({
        message: "Request failed with status 429",
      });

      expect(res.title).toBe("Demasiados intentos");
      expect(res.description).toContain("Por seguridad se bloquearon temporalmente");
    });

    it("should humanize invalid credentials", () => {
      const res = getHumanAuthErrorMessage({
        message: "Invalid login credentials",
      });

      expect(res.title).toBe("Credenciales incorrectas");
    });

    it("should humanize access_denied", () => {
      const res = getHumanAuthErrorMessage({
        error: "access_denied",
        error_description: "Access has been denied",
      });

      expect(res.title).toBe("Acceso denegado");
    });
  });

  describe("extractAuthUrlError", () => {
    it("should return null when there are no errors in URL", () => {
      window.location.hash = "";
      window.location.search = "";
      expect(extractAuthUrlError()).toBeNull();
    });

    it("should correctly parse Supabase hash error format", () => {
      window.location.hash =
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=";
      window.location.search = "";

      const result = extractAuthUrlError();
      expect(result).not.toBeNull();
      expect(result?.errorCode).toBe("otp_expired");
      expect(result?.errorDescription).toBe("Email link is invalid or has expired");
    });

    it("should correctly parse query search error format", () => {
      window.location.hash = "";
      window.location.search = "?error=access_denied&error_code=otp_expired";

      const result = extractAuthUrlError();
      expect(result).not.toBeNull();
      expect(result?.errorCode).toBe("otp_expired");
    });
  });

  describe("isNetworkOrConnectionError", () => {
    it("detects failed to fetch as connection error", () => {
      expect(isNetworkOrConnectionError(new Error("Failed to fetch"))).toBe(true);
    });

    it("does not flag regular auth errors as network error", () => {
      expect(isNetworkOrConnectionError(new Error("Invalid login credentials"))).toBe(false);
    });
  });
});
