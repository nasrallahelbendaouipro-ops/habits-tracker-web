revoke execute on function public.upsert_health_reading(
  uuid, integer, integer, numeric, integer, numeric, numeric
) from anon, authenticated;

alter function public.upsert_health_reading(
  uuid, integer, integer, numeric, integer, numeric, numeric
) set search_path = public, pg_temp;
