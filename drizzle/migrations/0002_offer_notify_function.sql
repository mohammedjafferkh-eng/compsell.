CREATE OR REPLACE FUNCTION public.offer_notify(p_offer_id uuid, p_sender uuid, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing uuid;
  v_buyer uuid;
  v_seller uuid;
BEGIN
  SELECT listing_id, buyer_id, seller_id INTO v_listing, v_buyer, v_seller
  FROM public.listing_offers WHERE id = p_offer_id;

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'offer not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_sender
     OR (p_sender IS DISTINCT FROM v_buyer AND p_sender IS DISTINCT FROM v_seller) THEN
    RAISE EXCEPTION 'not a participant of this offer';
  END IF;

  INSERT INTO public.conversations (listing_id, buyer_id, seller_id)
  VALUES (v_listing, v_buyer, v_seller)
  ON CONFLICT (listing_id, buyer_id) DO NOTHING;

  INSERT INTO public.messages (conversation_id, sender_id, message)
  SELECT c.id, p_sender, p_message
  FROM public.conversations c
  WHERE c.listing_id = v_listing AND c.buyer_id = v_buyer;
END $$;

REVOKE EXECUTE ON FUNCTION public.offer_notify(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.offer_notify(uuid, uuid, text) TO authenticated;
