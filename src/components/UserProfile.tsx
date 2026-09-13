import { useState, useEffect, useRef } from "react";
import { User, Mail, Camera, LogOut, Loader2, Trash2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/services/storage.service";
import { toast } from "sonner";

interface ProfileData {
  name: string;
  email: string;
  avatar_url: string;
}

export function UserProfilePage() {
  const { t } = useSettings();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: user?.email || "",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const metaFullName = (user.user_metadata?.full_name || user.user_metadata?.name || "") as string;
    const metaAvatar = (user.user_metadata?.avatar_url || user.user_metadata?.picture || "") as string;

    supabase
      .from("profiles")
      .select("name, email, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            name: data.name || metaFullName,
            email: data.email || user.email || "",
            avatar_url: data.avatar_url || metaAvatar,
          });
        } else {
          setProfile({
            name: metaFullName,
            email: user.email || "",
            avatar_url: metaAvatar,
          });
        }
      });
  }, [user]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(file);
      setProfile(p => ({ ...p, avatar_url: publicUrl }));
      toast.success(t("profile.avatarUploaded"));
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      toast.error(err.message || t("profile.avatarUploadError"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAvatarUrlPrompt = () => {
    const url = prompt(t("profile.avatarPrompt"), profile.avatar_url);
    if (url !== null) {
      setProfile(p => ({ ...p, avatar_url: url.trim() }));
    }
  };

  const handleRemoveAvatar = () => {
    setProfile(p => ({ ...p, avatar_url: "" }));
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const trimmedName = profile.name.trim();
      const trimmedAvatar = profile.avatar_url.trim();

      // 1. Guardar en public.profiles (upsert para idempotencia completa)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            name: trimmedName,
            avatar_url: trimmedAvatar,
            email: user.email || profile.email,
          },
          { onConflict: "user_id" }
        );

      if (profileError) throw profileError;

      // 2. Sincronizar en auth.users (metadatos de sesión y Authentication en Supabase)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          name: trimmedName,
          avatar_url: trimmedAvatar,
        },
      });

      if (authError) {
        console.warn("Auth metadata update warning:", authError);
      }

      toast.success(t("profile.saveSuccess"));
    } catch (err: any) {
      console.error("Error saving profile:", err);
      toast.error(t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.name
    ? profile.name
        .split(" ")
        .filter(Boolean)
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="pt-4 px-4 max-w-lg mx-auto">
      <h1 className="text-[20px] font-display font-semibold text-foreground mb-6">
        {t("nav.profile")}
      </h1>

      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden shadow-sm">
            {uploadingAvatar ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name || "Avatar"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              initials
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileSelect}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label={t("profile.uploadPhoto")}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1 min-h-[36px] px-2 py-1 rounded-md"
          >
            <Camera className="w-3.5 h-3.5" />
            {t("profile.uploadPhoto")}
          </button>

          <span className="text-muted-foreground/40 text-xs">•</span>

          <button
            type="button"
            onClick={handleAvatarUrlPrompt}
            className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 min-h-[36px] px-2 py-1 rounded-md"
          >
            <Globe className="w-3.5 h-3.5" />
            {t("profile.enterUrl")}
          </button>

          {profile.avatar_url ? (
            <>
              <span className="text-muted-foreground/40 text-xs">•</span>
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs text-destructive hover:underline font-medium flex items-center gap-1 min-h-[36px] px-2 py-1 rounded-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("profile.removeAvatar")}
              </button>
            </>
          ) : null}
        </div>

        <span className="mt-1 text-xs text-muted-foreground">{user?.email}</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[12px] text-muted-foreground font-medium mb-1 block uppercase tracking-wider">
            {t("profile.nameLabel")}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder={t("profile.namePlaceholder")}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-input border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-[12px] text-muted-foreground font-medium mb-1 block uppercase tracking-wider">
            {t("profile.emailLabel")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-input border border-border text-foreground/50 text-[14px] outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={saveProfile} disabled={saving || uploadingAvatar} className="w-full gap-2">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("profile.saving")}
            </>
          ) : (
            t("profile.saveChanges")
          )}
        </Button>
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          {t("profile.privacyNote")}
        </p>
      </div>
    </div>
  );
}
