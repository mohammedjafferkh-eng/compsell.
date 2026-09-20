CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
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
REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated, service_role;

DROP POLICY "Owners can delete any listing" ON public.listings;
CREATE POLICY "Owners can delete any listing"
ON public.listings FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'owner'));

DROP POLICY "Owners can delete any listing image" ON public.listing_images;
CREATE POLICY "Owners can delete any listing image"
ON public.listing_images FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'owner'));

DROP POLICY "Owners can delete listing image files" ON storage.objects;
CREATE POLICY "Owners can delete listing image files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'listing-images'
  AND private.has_role(auth.uid(), 'owner')
);

DROP FUNCTION public.has_role(UUID, public.app_role);