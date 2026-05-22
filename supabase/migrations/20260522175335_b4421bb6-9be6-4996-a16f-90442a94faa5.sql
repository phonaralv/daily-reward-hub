-- ENUM
CREATE TYPE public.ledger_kind AS ENUM ('daily_reward','quest_reward','adjustment','spend');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- WALLETS
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_self_select" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- intentionally NO insert/update/delete policy: only the SECURITY DEFINER
-- trigger function may mutate this table.

-- LEDGER (append-only)
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind public.ledger_kind NOT NULL,
  amount bigint NOT NULL,
  ref_kind text NOT NULL,
  ref_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_entries_idem UNIQUE (user_id, ref_kind, ref_id)
);
CREATE INDEX ledger_entries_user_created_idx
  ON public.ledger_entries (user_id, created_at DESC);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_self_select" ON public.ledger_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- NO insert/update/delete policy. Only SECURITY DEFINER RPCs may write.

-- Trigger: ledger INSERT -> wallet upsert (single entry point)
CREATE OR REPLACE FUNCTION public.apply_ledger_to_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.user_id, NEW.amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.wallets.balance + EXCLUDED.balance,
        updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER ledger_after_insert
AFTER INSERT ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.apply_ledger_to_wallet();

-- RPC: claim_daily_reward (idempotent via UNIQUE)
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS TABLE (amount bigint, new_balance bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_ref text := 'daily:' || to_char(v_today, 'YYYY-MM-DD');
  v_amount bigint := 100;
  v_balance bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  BEGIN
    INSERT INTO public.ledger_entries (user_id, kind, amount, ref_kind, ref_id)
    VALUES (v_uid, 'daily_reward', v_amount, 'daily_reward', v_ref);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END;

  SELECT w.balance INTO v_balance FROM public.wallets w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT v_amount, v_balance;
END $$;

REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;