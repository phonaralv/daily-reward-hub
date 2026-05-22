-- Trigger-only functions: revoke direct EXECUTE from everyone
REVOKE ALL ON FUNCTION public.apply_ledger_to_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- claim_daily_reward: only signed-in users may invoke
REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;