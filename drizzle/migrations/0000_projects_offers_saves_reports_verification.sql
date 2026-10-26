ALTER TABLE public.listings ADD COLUMN is_project boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN components_used text;
ALTER TABLE public.listings ADD COLUMN includes_code boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN includes_report boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN includes_hardware boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles ADD COLUMN verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET verified = (NEW.email_confirmed_at IS NOT NULL) WHERE id = NEW.id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sync_profile_verification_ins ON auth.users;
CREATE TRIGGER sync_profile_verification_ins
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification();

DROP TRIGGER IF EXISTS sync_profile_verification_upd ON auth.users;
CREATE TRIGGER sync_profile_verification_upd
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification();

REVOKE EXECUTE ON FUNCTION public.sync_profile_verification() FROM PUBLIC, anon, authenticated;

UPDATE public.profiles p SET verified = (u.email_confirmed_at IS NOT NULL)
FROM auth.users u WHERE p.id = u.id;

CREATE TABLE public.saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_listings TO authenticated;
GRANT ALL ON public.saved_listings TO service_role;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_insert_own ON public.saved_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY saved_select_own ON public.saved_listings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY saved_delete_own ON public.saved_listings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.seller_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, seller_id)
);
GRANT SELECT, INSERT, DELETE ON public.seller_follows TO authenticated;
GRANT ALL ON public.seller_follows TO service_role;
ALTER TABLE public.seller_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY follows_insert_own ON public.seller_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_select_own ON public.seller_follows FOR SELECT TO authenticated USING (auth.uid() = follower_id);
CREATE POLICY follows_delete_own ON public.seller_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE TABLE public.listing_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL,
  counter_amount numeric,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.listing_offers TO authenticated;
GRANT ALL ON public.listing_offers TO service_role;
ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_insert_buyer ON public.listing_offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND buyer_id <> seller_id);
CREATE POLICY offers_read_participants ON public.listing_offers FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY offers_update_seller ON public.listing_offers FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

CREATE TABLE public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_insert_own ON public.listing_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY reports_select ON public.listing_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR private.has_role(auth.uid(), 'owner'));
CREATE POLICY reports_update_owner ON public.listing_reports FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'owner')) WITH CHECK (private.has_role(auth.uid(), 'owner'));
