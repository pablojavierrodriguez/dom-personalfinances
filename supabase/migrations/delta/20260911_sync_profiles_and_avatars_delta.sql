-- =============================================================================
-- DELTA: 20260911_sync_profiles_and_avatars_delta.sql
-- Propósito: Sincronización bidireccional entre public.profiles y auth.users,
--            soporte de avatar_url en signup y creación de bucket 'avatars'.
-- Aplicación: Supabase Cloud / Producción (idempotente)
-- =============================================================================

-- 1. Actualizar handle_new_user() para incluir avatar_url y fallback a name/picture
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN public.profiles.name = '' OR public.profiles.name IS NULL THEN EXCLUDED.name ELSE public.profiles.name END,
    avatar_url = CASE WHEN public.profiles.avatar_url = '' OR public.profiles.avatar_url IS NULL THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Asegurar trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Función y Trigger para sincronizar cambios desde public.profiles hacia auth.users.raw_user_meta_data
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.name IS NOT DISTINCT FROM NEW.name AND OLD.avatar_url IS NOT DISTINCT FROM NEW.avatar_url THEN
    RETURN NEW;
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'full_name', NEW.name,
    'name', NEW.name,
    'avatar_url', NEW.avatar_url
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_profile_updated_sync_auth ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_auth
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth_user();

-- 3. Bucket de almacenamiento 'avatars'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars"            ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar"   ON storage.objects;

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 4. Backfill: Sincronizar datos existentes entre auth.users y public.profiles
-- A) De public.profiles hacia auth.users
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'full_name', p.name,
  'name', p.name,
  'avatar_url', p.avatar_url
)
FROM public.profiles p
WHERE p.user_id = u.id
  AND (p.name IS NOT NULL AND p.name != '');

-- B) De auth.users hacia public.profiles si public.profiles está vacío
UPDATE public.profiles p
SET
  name = CASE
    WHEN (p.name IS NULL OR p.name = '')
    THEN COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', p.name)
    ELSE p.name
  END,
  avatar_url = CASE
    WHEN (p.avatar_url IS NULL OR p.avatar_url = '')
    THEN COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', p.avatar_url)
    ELSE p.avatar_url
  END
FROM auth.users u
WHERE u.id = p.user_id;
