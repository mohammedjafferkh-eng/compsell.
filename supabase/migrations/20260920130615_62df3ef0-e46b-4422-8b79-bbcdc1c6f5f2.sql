REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, name, avatar_url, city, campus, rating, review_count, created_at) ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;