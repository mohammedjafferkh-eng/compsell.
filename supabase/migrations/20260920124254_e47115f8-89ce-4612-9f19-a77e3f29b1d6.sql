DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

INSERT INTO public.user_roles (user_id, role)
VALUES ('2a8df159-3a9b-4071-88c6-ccb63e4db6be', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE POLICY "Owners can delete any listing"
ON public.listings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete any listing image"
ON public.listing_images FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete listing image files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'listing-images'
  AND public.has_role(auth.uid(), 'owner')
);