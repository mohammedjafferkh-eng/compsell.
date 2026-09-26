DROP POLICY IF EXISTS listing_images_read ON storage.objects;
CREATE POLICY listing_images_read ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS avatars_read ON storage.objects;
CREATE POLICY avatars_read ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');