
-- 2) FRAUD SIGNALS: stop exposing any rows to end users
DROP POLICY IF EXISTS fraud_signals_self_select ON public.fraud_signals;

-- 3) LEADERBOARD: hide user_id; only self row is visible directly.
DROP POLICY IF EXISTS leaderboard_entries_public_select ON public.leaderboard_entries;
CREATE POLICY leaderboard_entries_self_select
  ON public.leaderboard_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_leaderboard_entries(p_period_id uuid)
RETURNS TABLE(
  rank integer,
  score bigint,
  reward_amount bigint,
  display_name text,
  is_self boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    le.rank,
    le.score,
    le.reward_amount,
    p.display_name,
    (le.user_id = auth.uid()) AS is_self
  FROM public.leaderboard_entries le
  LEFT JOIN public.profiles p ON p.id = le.user_id
  WHERE le.period_id = p_period_id
  ORDER BY le.score DESC, le.user_id ASC
  LIMIT 50
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_entries(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_entries(uuid) TO authenticated;

-- 4) SECURITY DEFINER hardening — revoke execute from public/authenticated on
-- internal helpers and trigger functions. Client-callable RPCs keep their grants.
REVOKE ALL ON FUNCTION public._apply_reward(uuid, ledger_kind, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_ledger_to_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_referral_fraud(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.streak_reward_amount(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_leaderboard(uuid) FROM PUBLIC, anon, authenticated;
