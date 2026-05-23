
-- Revoke from PUBLIC/anon, grant to authenticated only.
REVOKE EXECUTE ON FUNCTION public.claim_daily_reward() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.progress_quest(text, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_quest(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.streak_reward_amount(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_ledger_to_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.progress_quest(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quest(text) TO authenticated;
