-- Supabase ran these on auth.users. Better Auth's users table takes over:
-- a new user gets a profile, and an email change refreshes the Gravatar.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (new.id, nullif(btrim(new.name), ''), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
--> statement-breakpoint
-- Trigger names fire in alphabetical order: the profile (and its
-- public_profiles mirror) exists before the Gravatar update runs.
CREATE TRIGGER "on_user_created" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint
CREATE TRIGGER "on_user_sync_gravatar" AFTER INSERT OR UPDATE OF "email" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION public.sync_gravatar_url();
--> statement-breakpoint
-- Files that lived in Supabase Storage: public announcement images and
-- private resumes. Served by app/files/[bucket]/[...path].
CREATE TABLE "public"."files" (
    "bucket" text NOT NULL,
    "path" text NOT NULL,
    "content_type" text NOT NULL,
    "size" integer NOT NULL,
    "data" bytea NOT NULL,
    "owner_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "files_pkey" PRIMARY KEY ("bucket", "path"),
    CONSTRAINT "files_bucket_check" CHECK ("bucket" IN ('announcement-images', 'resumes'))
);
