CREATE TABLE public.push_devices (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own push devices" ON public.push_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members register own push devices" ON public.push_devices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members update own push devices" ON public.push_devices FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members remove own push devices" ON public.push_devices FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX push_devices_user_idx ON public.push_devices(user_id);