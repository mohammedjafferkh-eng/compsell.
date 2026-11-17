DROP POLICY IF EXISTS listing_images_read ON storage.objects;
DROP POLICY IF EXISTS avatars_read ON storage.objects;
CREATE POLICY listing_images_read_published ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'listing-images' AND EXISTS (SELECT 1 FROM public.listing_images li WHERE li.image_url = objects.name));
CREATE POLICY listing_images_read_own ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY avatars_read_published ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_url = objects.name));
CREATE POLICY avatars_read_own ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);