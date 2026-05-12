-- SEO: expose sanitized job positions to anon for JobPosting structured data.
-- Returns only name/type/location/count — salary/responsibilities/requirements
-- stay private (gated by competition_private_details RLS).
create or replace function public.get_public_recruitment_positions(p_competition_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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

grant execute on function public.get_public_recruitment_positions(uuid) to anon, authenticated;
