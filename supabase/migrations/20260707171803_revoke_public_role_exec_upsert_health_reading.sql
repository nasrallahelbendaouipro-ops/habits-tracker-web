-- The 20260707171357 migration revoked EXECUTE from anon/authenticated
-- directly, but Postgres also grants EXECUTE to the PUBLIC pseudo-role by
-- default on function creation, and every role implicitly inherits PUBLIC's
-- grants. Verified via information_schema.routine_privileges that PUBLIC
-- still had EXECUTE after the prior migration — this closes that gap.
revoke execute on function public.upsert_health_reading(
  uuid, integer, integer, numeric, integer, numeric, numeric
) from public;
