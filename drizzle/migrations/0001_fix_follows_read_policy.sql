DROP POLICY follows_select_own ON public.seller_follows;
CREATE POLICY follows_read_all ON public.seller_follows FOR SELECT TO authenticated USING (true);