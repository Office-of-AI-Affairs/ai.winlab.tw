-- Admin create user: inserts into auth.users + auth.identities + profiles
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email text,
  p_name text DEFAULT NULL,
  p_role text DEFAULT 'user'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
  clean_email text := lower(trim(p_email));
  random_pass text := encode(gen_random_bytes(24), 'hex');
BEGIN
  -- Caller must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Check duplicate email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
    RAISE EXCEPTION 'Email already registered: %', clean_email;
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'user', 'vendor') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Insert auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    clean_email,
    crypt(random_pass, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', trim(p_name)),
    now(), now(),
    false, false
  );

  -- Insert identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    email, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', clean_email, 'email_verified', true, 'phone_verified', false),
    'email',
    new_id::text,
    clean_email,
    now(), now(), now()
  );

  -- Upsert profile
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (new_id, trim(p_name), p_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN new_id;
END;
$$;

-- Admin delete user: removes from auth.users (cascades to identities, sessions)
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Caller must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Cannot delete yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Check user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete profile first (may not cascade from auth)
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete from auth (cascades to identities, sessions, etc)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
