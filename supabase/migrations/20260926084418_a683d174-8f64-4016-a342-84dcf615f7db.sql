DROP POLICY IF EXISTS listing_images_read ON storage.objects;
CREATE POLICY listing_images_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'listing-images'
  AND (
    owner_id = (select auth.uid()::text)
    OR (storage.foldername(name))[1] = (select auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.listing_images li
      WHERE li.image_url LIKE '%' || storage.objects.name
    )
  )
);

DROP POLICY IF EXISTS avatars_read ON storage.objects;
CREATE POLICY avatars_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    owner_id = (select auth.uid()::text)
    OR (storage.foldername(name))[1] = (select auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.avatar_url LIKE '%' || storage.objects.name
    )
  )
);