-- Baseline: the Supabase public schema as of 2026-10-24, without RLS.
-- Permissions live in server code now. Triggers that record who changed a
-- row read app_user_id(), which the server sets per transaction.
-- Function bodies refer to tables created further down.
SET LOCAL check_function_bodies = false;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.app_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."announcement_slug_from_title"("input_title" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  result text;
begin
  result := btrim(input_title);
  result := regexp_replace(result, '[ \t\n\r]+', '-', 'g');
  result := regexp_replace(result, '[/?#%&+="''<>　]', '', 'g');
  result := btrim(result, '-');

  if result = '' then
    result := 'announcement';
  end if;

  return result;
end;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."announcement_unique_slug"("base_slug" "text", "exclude_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  candidate text;
  suffix int;
begin
  candidate := base_slug;
  suffix := 1;
  while exists (
    select 1 from announcements
    where slug = candidate
      and (exclude_id is null or id <> exclude_id)
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;
  return candidate;
end;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."announcements_set_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.slug is null then
    new.slug := announcement_unique_slug(announcement_slug_from_title(new.title), new.id);
  end if;
  return new;
end;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."auto_add_recruitment_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.competition_owners (competition_id, user_id, added_by)
    VALUES (NEW.id, NEW.created_by, NEW.created_by)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "social_links" "text"[] DEFAULT '{}'::"text"[],
    "bio" "text",
    "linkedin" "text",
    "facebook" "text",
    "github" "text",
    "website" "text",
    "resume" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'vendor'::"text", 'member'::"text", 'editor'::"text"])))
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."compute_has_profile_data"("p" "public"."profiles") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    nullif(btrim(p.bio), '') IS NOT NULL
    OR nullif(btrim(p.phone), '') IS NOT NULL
    OR nullif(btrim(p.linkedin), '') IS NOT NULL
    OR nullif(btrim(p.facebook), '') IS NOT NULL
    OR nullif(btrim(p.github), '') IS NOT NULL
    OR nullif(btrim(p.website), '') IS NOT NULL
    OR nullif(btrim(p.resume), '') IS NOT NULL
    OR (p.social_links IS NOT NULL AND array_length(p.social_links, 1) > 0),
    false
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."consume_upload_token"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row public.upload_tokens%ROWTYPE;
BEGIN
  UPDATE public.upload_tokens
  SET used = true
  WHERE token = p_token
    AND used = false
    AND expires_at >= now()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_row.user_id,
    'category', v_row.category
  );
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."get_interest_count"("p_competition_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::int
  FROM public.recruitment_interests
  WHERE competition_id = p_competition_id;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."get_public_recruitment_positions"("p_competition_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', p->>'name',
        'type', p->>'type',
        'location', p->>'location',
        'count', (p->>'count')::int
      )
    ),
    '[]'::jsonb
  )
  from competition_private_details cpd,
       jsonb_array_elements(cpd.positions) p
  where cpd.competition_id = p_competition_id
    and cpd.positions is not null;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."gravatar_url"("email" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT 'https://gravatar.com/avatar/' || encode(digest(lower(trim(email)), 'sha256'), 'hex') || '?s=200&d=404'
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."record_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  changed text[];
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (table_name, row_id, action, actor, changed_fields)
    values (TG_TABLE_NAME, NEW.id, 'insert', public.app_user_id(), null);
    return NEW;
  elsif TG_OP = 'UPDATE' then
    select array_agg(n.key order by n.key)
    into changed
    from jsonb_each(to_jsonb(NEW)) as n(key, value)
    join jsonb_each(to_jsonb(OLD)) as o(key, value) using (key)
    where n.value is distinct from o.value;

    insert into public.audit_log (table_name, row_id, action, actor, changed_fields)
    values (TG_TABLE_NAME, NEW.id, 'update', public.app_user_id(), changed);
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (table_name, row_id, action, actor, changed_fields)
    values (TG_TABLE_NAME, OLD.id, 'delete', public.app_user_id(), null);
    return OLD;
  end if;
  return null;
end;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."record_content_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  snap jsonb;
begin
  if TG_TABLE_NAME = 'announcements' then
    snap := jsonb_build_object(
      'title', OLD.title,
      'title_en', OLD.title_en,
      'content', OLD.content,
      'status', OLD.status,
      'publish_at', OLD.publish_at,
      'category', OLD.category,
      'date', OLD.date
    );
  elsif TG_TABLE_NAME = 'results' then
    snap := jsonb_build_object(
      'title', OLD.title,
      'title_en', OLD.title_en,
      'content', OLD.content,
      'status', OLD.status,
      'date', OLD.date
    );
  else
    snap := to_jsonb(OLD);
  end if;

  insert into public.content_revisions (table_name, row_id, snapshot, changed_by)
  values (TG_TABLE_NAME, OLD.id, snap, public.app_user_id());

  return new;
end;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."search_site"("query" "text", "locale" "text" DEFAULT 'zh-TW'::"text") RETURNS TABLE("type" "text", "id" "uuid", "slug" "text", "event_slug" "text", "title" "text", "snippet" "text", "rank" real)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with q as (
    select
      btrim(query) as raw,
      websearch_to_tsquery('simple', query) as tsq
  ),
  announcement_matches as (
    select
      'announcement'::text as type,
      a.id,
      a.slug,
      e.slug as event_slug,
      case
        when locale = 'en' and a.title_en is not null and btrim(a.title_en) <> '' then a.title_en
        else a.title
      end as title,
      left(a.search_text, 160) as snippet,
      (
        (case when a.search_text ilike '%' || q.raw || '%' then 1.0 else 0 end)
        + coalesce(ts_rank(a.search_vector, q.tsq), 0) * 0.5
        + coalesce(similarity(a.search_text, q.raw), 0) * 0.3
      )::real as rank
    from public.announcements a
    left join public.events e on e.id = a.event_id
    cross join q
    where a.status = 'published'
      and (a.publish_at is null or a.publish_at <= now())
      and q.raw <> ''
      and (
        a.search_vector @@ q.tsq
        or a.search_text ilike '%' || q.raw || '%'
        or similarity(a.search_text, q.raw) > 0.15
      )
  ),
  event_matches as (
    select
      'event'::text as type,
      ev.id,
      ev.slug,
      ev.slug as event_slug,
      case
        when locale = 'en' and ev.name_en is not null and btrim(ev.name_en) <> '' then ev.name_en
        else ev.name
      end as title,
      left(ev.search_text, 160) as snippet,
      (
        (case when ev.search_text ilike '%' || q.raw || '%' then 1.0 else 0 end)
        + coalesce(ts_rank(ev.search_vector, q.tsq), 0) * 0.5
        + coalesce(similarity(ev.search_text, q.raw), 0) * 0.3
      )::real as rank
    from public.events ev
    cross join q
    where ev.status = 'published'
      and q.raw <> ''
      and (
        ev.search_vector @@ q.tsq
        or ev.search_text ilike '%' || q.raw || '%'
        or similarity(ev.search_text, q.raw) > 0.15
      )
  ),
  result_matches as (
    select
      'result'::text as type,
      r.id,
      r.id::text as slug,
      e2.slug as event_slug,
      case
        when locale = 'en' and r.title_en is not null and btrim(r.title_en) <> '' then r.title_en
        else r.title
      end as title,
      left(r.search_text, 160) as snippet,
      (
        (case when r.search_text ilike '%' || q.raw || '%' then 1.0 else 0 end)
        + coalesce(ts_rank(r.search_vector, q.tsq), 0) * 0.5
        + coalesce(similarity(r.search_text, q.raw), 0) * 0.3
      )::real as rank
    from public.results r
    left join public.events e2 on e2.id = r.event_id
    cross join q
    where r.status = 'published'
      and q.raw <> ''
      and (
        r.search_vector @@ q.tsq
        or r.search_text ilike '%' || q.raw || '%'
        or similarity(r.search_text, q.raw) > 0.15
      )
  )
  select * from announcement_matches
  union all
  select * from event_matches
  union all
  select * from result_matches
  order by rank desc
  limit 40
$$;
--> statement-breakpoint
COMMENT ON FUNCTION "public"."search_site"("query" "text", "locale" "text") IS 'Site-wide search across published announcements/events/results (#45). SECURITY INVOKER — respects table RLS. Announcement branch also gates on publish_at (#47).';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."set_articles_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."set_articles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."sync_gravatar_url"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.public_profiles
  SET avatar_url = public.gravatar_url(NEW.email)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."sync_public_profile_from_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.public_profiles (
    id, created_at, updated_at,
    display_name, avatar_url,
    bio, linkedin, facebook, github, website,
    social_links, role, resume
  )
  VALUES (
    NEW.id, NEW.created_at, NEW.updated_at,
    NEW.display_name, NEW.avatar_url,
    NEW.bio, NEW.linkedin, NEW.facebook, NEW.github, NEW.website,
    COALESCE(NEW.social_links, '{}'::text[]), NEW.role, NEW.resume
  )
  ON CONFLICT (id) DO UPDATE
  SET
    updated_at   = NEW.updated_at,
    display_name = NEW.display_name,
    avatar_url   = NEW.avatar_url,
    bio          = NEW.bio,
    linkedin     = NEW.linkedin,
    facebook     = NEW.facebook,
    github       = NEW.github,
    website      = NEW.website,
    social_links = COALESCE(NEW.social_links, '{}'::text[]),
    role         = NEW.role,
    resume       = NEW.resume;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."sync_public_profile_has_data"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.public_profiles (id, display_name, avatar_url, has_profile_data)
  VALUES (NEW.id, NEW.display_name, NEW.avatar_url, public.compute_has_profile_data(NEW))
  ON CONFLICT (id) DO UPDATE
    SET has_profile_data = EXCLUDED.has_profile_data,
        updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."tiptap_extract_text"("node" "jsonb") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    SET "search_path" TO 'pg_catalog'
    AS $_$
  select coalesce(string_agg(leaf.value #>> '{}', ' '), '')
  from jsonb_path_query(coalesce(node, '{}'::jsonb), '$.**.text') as leaf(value)
$_$;
--> statement-breakpoint
COMMENT ON FUNCTION "public"."tiptap_extract_text"("node" "jsonb") IS 'Extract concatenated leaf text from a Tiptap JSON document, for FTS/trigram indexing.';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."update_competitions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."update_external_results_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."update_results_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "category" "text" DEFAULT '一般'::"text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "author_id" "uuid",
    "event_id" "uuid",
    "slug" "text" NOT NULL,
    "title_en" "text",
    "search_text" "text" GENERATED ALWAYS AS (((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("title_en", ''::"text")) || ' '::"text") || COALESCE("public"."tiptap_extract_text"("content"), ''::"text"))) STORED,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"simple"'::"regconfig", ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("title_en", ''::"text")) || ' '::"text") || COALESCE("public"."tiptap_extract_text"("content"), ''::"text")))) STORED,
    "publish_at" timestamp with time zone,
    CONSTRAINT "announcements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);
--> statement-breakpoint
COMMENT ON COLUMN "public"."announcements"."publish_at" IS 'Optional future timestamp. A published row is only "live" for anon/public reads once publish_at has passed (or is null). NULL = live immediately, same as before this column existed.';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" DEFAULT '新文章'::"text" NOT NULL,
    "summary" "text",
    "cover_image_url" "text",
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "articles_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "row_id" "uuid",
    "action" "text" NOT NULL,
    "actor" "uuid" DEFAULT public.app_user_id(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_fields" "text"[],
    CONSTRAINT "audit_log_action_check" CHECK (("action" = ANY (ARRAY['insert'::"text", 'update'::"text", 'delete'::"text"])))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."carousel_slides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text",
    "link" "text",
    "image" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "title_en" "text",
    "description_en" "text"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."competition_owners" (
    "competition_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "added_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."competition_private_details" (
    "competition_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "positions" "jsonb",
    "application_method" "jsonb",
    "contact" "jsonb",
    "required_documents" "text"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."competitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "link" "text" DEFAULT ''::"text" NOT NULL,
    "image" "text" DEFAULT '/placeholder.png'::"text",
    "start_date" "text" DEFAULT ''::"text",
    "company_description" "text",
    "event_id" "uuid",
    "end_date" "date",
    "created_by" "uuid",
    "pinned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "position" "text",
    "phone" "text",
    "email" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."content_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "row_id" "uuid" NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_revisions_table_name_check" CHECK (("table_name" = ANY (ARRAY['announcements'::"text", 'results'::"text"])))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."event_participants" (
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "cover_image" "text",
    "pinned" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "name_en" "text",
    "search_text" "text" GENERATED ALWAYS AS (((((COALESCE("name", ''::"text") || ' '::"text") || COALESCE("name_en", ''::"text")) || ' '::"text") || COALESCE("description", ''::"text"))) STORED,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"simple"'::"regconfig", ((((COALESCE("name", ''::"text") || ' '::"text") || COALESCE("name_en", ''::"text")) || ' '::"text") || COALESCE("description", ''::"text")))) STORED,
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."external_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "link" "text",
    "image" "text"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."introduction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" DEFAULT '國立陽明交通大學 人工智慧專責辦公室'::"text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "title_en" "text",
    "content_en" "jsonb"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "summary" "text",
    "image" "text",
    "link" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "school" "text",
    "research_areas" "text",
    "email" "text",
    "website" "text",
    "member_role" "text",
    "group_order" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "organization_members_category_check" CHECK (("category" = ANY (ARRAY['core'::"text", 'legal_entity'::"text", 'industry'::"text"])))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."privacy_policy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "jsonb" NOT NULL,
    "version" integer NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."public_profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "has_profile_data" boolean DEFAULT false NOT NULL,
    "bio" "text",
    "linkedin" "text",
    "facebook" "text",
    "github" "text",
    "website" "text",
    "social_links" "text"[] DEFAULT '{}'::"text"[],
    "role" "text",
    "resume" "text"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."recruitment_interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competition_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."result_coauthors" (
    "result_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "result_coauthors_not_self_author" CHECK (true)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."result_tags" (
    "result_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "date" "text" DEFAULT ''::"text" NOT NULL,
    "header_image" "text" DEFAULT '/placeholder.png'::"text",
    "summary" "text" DEFAULT ''::"text",
    "content" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "author_id" "uuid",
    "pinned" boolean DEFAULT false NOT NULL,
    "event_id" "uuid",
    "title_en" "text",
    "search_text" "text" GENERATED ALWAYS AS (((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("title_en", ''::"text")) || ' '::"text") || COALESCE("public"."tiptap_extract_text"("content"), ''::"text"))) STORED,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"simple"'::"regconfig", ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("title_en", ''::"text")) || ' '::"text") || COALESCE("public"."tiptap_extract_text"("content"), ''::"text")))) STORED,
    CONSTRAINT "results_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."upload_tokens" (
    "token" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'announcement'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:10:00'::interval) NOT NULL,
    "used" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."carousel_slides"
    ADD CONSTRAINT "carousel_slides_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."competition_owners"
    ADD CONSTRAINT "competition_owners_pkey" PRIMARY KEY ("competition_id", "user_id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."competition_private_details"
    ADD CONSTRAINT "competition_private_details_pkey" PRIMARY KEY ("competition_id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."content_revisions"
    ADD CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_pkey" PRIMARY KEY ("event_id", "user_id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_slug_key" UNIQUE ("slug");
--> statement-breakpoint
ALTER TABLE ONLY "public"."external_results"
    ADD CONSTRAINT "external_results_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."introduction"
    ADD CONSTRAINT "introduction_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."privacy_policy"
    ADD CONSTRAINT "privacy_policy_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."public_profiles"
    ADD CONSTRAINT "public_profiles_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."recruitment_interests"
    ADD CONSTRAINT "recruitment_interests_competition_id_user_id_key" UNIQUE ("competition_id", "user_id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."recruitment_interests"
    ADD CONSTRAINT "recruitment_interests_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."result_coauthors"
    ADD CONSTRAINT "result_coauthors_pkey" PRIMARY KEY ("result_id", "user_id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."result_tags"
    ADD CONSTRAINT "result_tags_pkey" PRIMARY KEY ("result_id", "tag_id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."upload_tokens"
    ADD CONSTRAINT "upload_tokens_pkey" PRIMARY KEY ("token");
--> statement-breakpoint
CREATE INDEX "announcements_search_text_trgm_idx" ON "public"."announcements" USING "gin" ("search_text" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "announcements_search_vector_idx" ON "public"."announcements" USING "gin" ("search_vector");
--> statement-breakpoint
CREATE UNIQUE INDEX "announcements_slug_key" ON "public"."announcements" USING "btree" ("slug");
--> statement-breakpoint
CREATE INDEX "events_search_text_trgm_idx" ON "public"."events" USING "gin" ("search_text" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "events_search_vector_idx" ON "public"."events" USING "gin" ("search_vector");
--> statement-breakpoint
CREATE INDEX "idx_announcements_author_id" ON "public"."announcements" USING "btree" ("author_id");
--> statement-breakpoint
CREATE INDEX "idx_announcements_event_id" ON "public"."announcements" USING "btree" ("event_id");
--> statement-breakpoint
CREATE INDEX "idx_announcements_publish_at" ON "public"."announcements" USING "btree" ("publish_at") WHERE ("publish_at" IS NOT NULL);
--> statement-breakpoint
CREATE INDEX "idx_articles_author_id" ON "public"."articles" USING "btree" ("author_id");
--> statement-breakpoint
CREATE INDEX "idx_articles_published_at" ON "public"."articles" USING "btree" ("published_at" DESC);
--> statement-breakpoint
CREATE INDEX "idx_articles_status" ON "public"."articles" USING "btree" ("status");
--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "public"."audit_log" USING "btree" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX "idx_audit_log_table_row" ON "public"."audit_log" USING "btree" ("table_name", "row_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "idx_competition_owners_user_id" ON "public"."competition_owners" USING "btree" ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_competitions_created_by" ON "public"."competitions" USING "btree" ("created_by");
--> statement-breakpoint
CREATE INDEX "idx_competitions_event_id" ON "public"."competitions" USING "btree" ("event_id");
--> statement-breakpoint
CREATE INDEX "idx_content_revisions_row" ON "public"."content_revisions" USING "btree" ("table_name", "row_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "idx_event_participants_user_id" ON "public"."event_participants" USING "btree" ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_external_results_user_id" ON "public"."external_results" USING "btree" ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_privacy_policy_created_by" ON "public"."privacy_policy" USING "btree" ("created_by");
--> statement-breakpoint
CREATE INDEX "idx_recruitment_interests_user_id" ON "public"."recruitment_interests" USING "btree" ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_result_coauthors_user_id" ON "public"."result_coauthors" USING "btree" ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_result_tags_tag_id" ON "public"."result_tags" USING "btree" ("tag_id");
--> statement-breakpoint
CREATE INDEX "idx_results_author_id" ON "public"."results" USING "btree" ("author_id");
--> statement-breakpoint
CREATE INDEX "idx_results_event_id" ON "public"."results" USING "btree" ("event_id");
--> statement-breakpoint
CREATE INDEX "idx_tags_parent_id" ON "public"."tags" USING "btree" ("parent_id");
--> statement-breakpoint
CREATE INDEX "idx_upload_tokens_expires_at" ON "public"."upload_tokens" USING "btree" ("expires_at");
--> statement-breakpoint
CREATE INDEX "privacy_policy_version_idx" ON "public"."privacy_policy" USING "btree" ("version" DESC);
--> statement-breakpoint
CREATE INDEX "results_search_text_trgm_idx" ON "public"."results" USING "gin" ("search_text" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "results_search_vector_idx" ON "public"."results" USING "gin" ("search_vector");
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "announcements_audit_log" AFTER INSERT OR DELETE OR UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."record_audit_log"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "announcements_record_revision" AFTER UPDATE ON "public"."announcements" FOR EACH ROW WHEN (("old".* IS DISTINCT FROM "new".*)) EXECUTE FUNCTION "public"."record_content_revision"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "announcements_set_slug_trigger" BEFORE INSERT ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."announcements_set_slug"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "articles_set_published_at" BEFORE INSERT OR UPDATE ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."set_articles_published_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "articles_set_updated_at" BEFORE UPDATE ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."set_articles_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "auto_add_recruitment_owner" AFTER INSERT ON "public"."competitions" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_recruitment_owner"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "carousel_slides_audit_log" AFTER INSERT OR DELETE OR UPDATE ON "public"."carousel_slides" FOR EACH ROW EXECUTE FUNCTION "public"."record_audit_log"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "carousel_slides_updated_at" BEFORE UPDATE ON "public"."carousel_slides" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "competition_private_details_updated_at" BEFORE UPDATE ON "public"."competition_private_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "competitions_updated_at" BEFORE UPDATE ON "public"."competitions" FOR EACH ROW EXECUTE FUNCTION "public"."update_competitions_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "events_audit_log" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."record_audit_log"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "introduction_updated_at" BEFORE UPDATE ON "public"."introduction" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "on_profiles_sync_has_data" AFTER INSERT OR UPDATE OF "bio", "phone", "linkedin", "facebook", "github", "website", "resume", "social_links" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_public_profile_has_data"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "organization_members_audit_log" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."record_audit_log"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "organization_members_updated_at" BEFORE UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "public_profiles_updated_at" BEFORE UPDATE ON "public"."public_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "results_audit_log" AFTER INSERT OR DELETE OR UPDATE ON "public"."results" FOR EACH ROW EXECUTE FUNCTION "public"."record_audit_log"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "results_record_revision" AFTER UPDATE ON "public"."results" FOR EACH ROW WHEN (("old".* IS DISTINCT FROM "new".*)) EXECUTE FUNCTION "public"."record_content_revision"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "results_updated_at" BEFORE UPDATE ON "public"."results" FOR EACH ROW EXECUTE FUNCTION "public"."update_results_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "set_external_results_updated_at" BEFORE UPDATE ON "public"."external_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_external_results_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER "sync_public_profile_from_profile" AFTER INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_public_profile_from_profile"();
--> statement-breakpoint
ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."competition_owners"
    ADD CONSTRAINT "competition_owners_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE ONLY "public"."competition_owners"
    ADD CONSTRAINT "competition_owners_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."competition_owners"
    ADD CONSTRAINT "competition_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."competition_private_details"
    ADD CONSTRAINT "competition_private_details_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."content_revisions"
    ADD CONSTRAINT "content_revisions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."external_results"
    ADD CONSTRAINT "external_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."privacy_policy"
    ADD CONSTRAINT "privacy_policy_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
--> statement-breakpoint
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."public_profiles"
    ADD CONSTRAINT "public_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."recruitment_interests"
    ADD CONSTRAINT "recruitment_interests_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."recruitment_interests"
    ADD CONSTRAINT "recruitment_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."result_coauthors"
    ADD CONSTRAINT "result_coauthors_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."result_coauthors"
    ADD CONSTRAINT "result_coauthors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."result_tags"
    ADD CONSTRAINT "result_tags_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."result_tags"
    ADD CONSTRAINT "result_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;
