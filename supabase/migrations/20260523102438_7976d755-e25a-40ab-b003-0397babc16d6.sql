
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Realtime publication
ALTER TABLE public.leaderboard_entries REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leaderboard_entries'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_entries';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'referrals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals';
  END IF;
END $$;

-- ensure_current_leaderboard_period (idempotent ISO weekly)
CREATE OR REPLACE FUNCTION public.ensure_current_leaderboard_period(p_kind text DEFAULT 'weekly')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
  v_id    uuid;
BEGIN
  IF p_kind <> 'weekly' THEN
    RAISE EXCEPTION 'unsupported_period_kind' USING ERRCODE = '22023';
  END IF;
  v_start := date_trunc('week', (now() AT TIME ZONE 'UTC'))::timestamptz;
  v_end   := v_start + INTERVAL '7 days';

  SELECT id INTO v_id FROM public.leaderboard_periods
    WHERE kind = p_kind AND starts_at = v_start;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.leaderboard_periods (kind, starts_at, ends_at)
  VALUES (p_kind, v_start, v_end)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.ensure_current_leaderboard_period(text) FROM PUBLIC, anon, authenticated;

-- push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subs_self_select ON public.push_subscriptions;
CREATE POLICY push_subs_self_select ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subs_self_insert ON public.push_subscriptions;
CREATE POLICY push_subs_self_insert ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subs_self_delete ON public.push_subscriptions;
CREATE POLICY push_subs_self_delete ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- pg_cron: weekly leaderboard settlement (Mon 00:05 UTC)
-- Calls the public TanStack route which validates x-cron-secret header.
DO $$
DECLARE
  v_existing int;
BEGIN
  SELECT COUNT(*) INTO v_existing FROM cron.job WHERE jobname = 'settle-leaderboard-weekly';
  IF v_existing > 0 THEN
    PERFORM cron.unschedule('settle-leaderboard-weekly');
  END IF;
END $$;

SELECT cron.schedule(
  'settle-leaderboard-weekly',
  '5 0 * * 1',
  $cron$
  SELECT net.http_post(
    url := 'https://project--ff1ae9d8-bcad-405a-ac39-d887b54f4b6b.lovable.app/api/public/cron/settle-leaderboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
