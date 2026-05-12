-- Fix: admin_create_user left auth token columns as NULL, which crashed
-- GoTrue's /recover endpoint with a 500 ("converting NULL to string is unsupported"),
-- making the "forgot password" flow unusable for any user created via the admin
-- panel. GoTrue's own INSERTs default these to '', so we mirror that here.
--
-- Also backfills existing rows so already-broken accounts can recover.

-- 1. Backfill historical NULLs (covers accounts created before this fix shipped)
UPDATE auth.users
SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change               = COALESCE(email_change, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE
     confirmation_token         IS NULL
  OR recovery_token             IS NULL
  OR email_change_token_new     IS NULL
  OR email_change_token_current IS NULL
  OR email_change               IS NULL
  OR phone_change               IS NULL
  OR phone_change_token         IS NULL
  OR reauthentication_token     IS NULL;

-- 2. Patch the RPC so future inserts ship with empty-string tokens from day one
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_name  text DEFAULT NULL,
  p_role  text DEFAULT 'user'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'auth', 'public', 'extensions'
AS $function$
DECLARE
  new_id      uuid := gen_random_uuid();
  clean_email text := lower(trim(p_email));
  random_pass text := encode(gen_random_bytes(24), 'hex');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
    RAISE EXCEPTION 'Email already registered: %', clean_email;
  END IF;

  IF p_role NOT IN ('admin', 'user', 'vendor') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    is_sso_user, is_anonymous,
    -- token columns must be '' not NULL, otherwise GoTrue /recover throws 500
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current,
    email_change, phone_change, phone_change_token,
    reauthentication_token
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
    false, false,
    '', '', '', '', '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', clean_email, 'email_verified', true, 'phone_verified', false),
    'email',
    new_id::text,
    now(), now(), now()
  );

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (new_id, trim(p_name), p_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN new_id;
END;
$function$;
