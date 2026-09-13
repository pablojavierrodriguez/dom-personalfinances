import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadAvatar, deleteAvatar } from "@/services/storage.service";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

describe("storage.service - avatar management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error if user is not authenticated", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as any);

    const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
    await expect(uploadAvatar(file)).rejects.toThrow("Usuario no autenticado");
  });

  it("rejects file larger than 5MB", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);

    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });

    await expect(uploadAvatar(largeFile)).rejects.toThrow("5MB");
  });

  it("rejects unsupported mime types", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);

    const pdfFile = new File(["pdf data"], "avatar.pdf", { type: "application/pdf" });
    await expect(uploadAvatar(pdfFile)).rejects.toThrow("Formato no soportado");
  });

  it("uploads valid image and returns public URL", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);

    const mockUpload = vi.fn().mockResolvedValueOnce({ data: { path: "user-123/avatar.png" }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://example.com/storage/v1/object/public/avatars/user-123/avatar.png" },
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as any);

    const validFile = new File(["img content"], "avatar.png", { type: "image/png" });
    const url = await uploadAvatar(validFile);

    expect(url).toBe("https://example.com/storage/v1/object/public/avatars/user-123/avatar.png");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining("user-123/avatar-"),
      validFile,
      expect.objectContaining({ upsert: true })
    );
  });

  it("deletes avatar from avatars bucket correctly", async () => {
    const mockRemove = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    vi.mocked(supabase.storage.from).mockReturnValueOnce({
      remove: mockRemove,
    } as any);

    await deleteAvatar("https://example.com/storage/v1/object/public/avatars/user-123/avatar.png");

    expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
    expect(mockRemove).toHaveBeenCalledWith(["user-123/avatar.png"]);
  });
});
