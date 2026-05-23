
-- Phase 2: Streak + Quest tables + RPCs + RLS

-- 1. Tables
CREATE TABLE public.streaks (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_day int NOT NULL DEFAULT 0 CHECK (current_day BETWEEN 0 AND 7),
  last_claim_date date,
  longest int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quests (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text,
  target int NOT NULL CHECK (target > 0),
  reward_amount bigint NOT NULL CHECK (reward_amount > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_quests (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_code text NOT NULL REFERENCES public.quests(code) ON DELETE CASCADE,
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_code)
);

CREATE INDEX user_quests_user_idx ON public.user_quests(user_id);

-- 2. RLS — SELECT-only; writes go through SECURITY DEFINER RPCs
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY streaks_self_select ON public.streaks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY quests_public_select ON public.quests
  FOR SELECT TO authenticated USING (active = true);

CREATE POLICY user_quests_self_select ON public.user_quests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Streak reward curve helper (server-only knowledge)
CREATE OR REPLACE FUNCTION public.streak_reward_amount(p_day int)
RETURNS bigint
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_day
    WHEN 1 THEN 100::bigint
    WHEN 2 THEN 120::bigint
    WHEN 3 THEN 150::bigint
    WHEN 4 THEN 180::bigint
    WHEN 5 THEN 220::bigint
    WHEN 6 THEN 260::bigint
    WHEN 7 THEN 400::bigint
    ELSE 100::bigint
  END
$$;

-- 4. Replace claim_daily_reward with streak-aware version (superset response)
--    Single entry point: still INSERTs into ledger_entries; wallet updated via trigger.
--    Idempotency: UNIQUE(user_id, ref_kind, ref_id), ref_id='daily:YYYY-MM-DD'.
DROP FUNCTION IF EXISTS public.claim_daily_reward();

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS TABLE(amount bigint, new_balance bigint, streak_day int, next_amount bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_ref text := 'daily:' || to_char(v_today, 'YYYY-MM-DD');
  v_prev_day int := 0;
  v_prev_date date;
  v_new_day int := 1;
  v_amount bigint;
  v_balance bigint;
  v_next bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Read prior streak (no race: row-locked by upsert below)
  SELECT current_day, last_claim_date
    INTO v_prev_day, v_prev_date
    FROM public.streaks WHERE user_id = v_uid FOR UPDATE;

  IF v_prev_date IS NULL THEN
    v_new_day := 1;
  ELSIF v_prev_date = v_today THEN
    -- already claimed today — bail
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  ELSIF v_prev_date = v_today - INTERVAL '1 day' THEN
    v_new_day := (v_prev_day % 7) + 1;
  ELSE
    v_new_day := 1; -- gap → reset
  END IF;

  v_amount := public.streak_reward_amount(v_new_day);
  v_next := public.streak_reward_amount((v_new_day % 7) + 1);

  -- Single entry point — INSERT into ledger; trigger updates wallets.
  BEGIN
    INSERT INTO public.ledger_entries (user_id, kind, amount, ref_kind, ref_id)
    VALUES (v_uid, 'daily_reward', v_amount, 'daily_reward', v_ref);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END;

  -- Persist streak after successful credit
  INSERT INTO public.streaks (user_id, current_day, last_claim_date, longest, updated_at)
  VALUES (v_uid, v_new_day, v_today, v_new_day, now())
  ON CONFLICT (user_id) DO UPDATE
    SET current_day = EXCLUDED.current_day,
        last_claim_date = EXCLUDED.last_claim_date,
        longest = GREATEST(public.streaks.longest, EXCLUDED.current_day),
        updated_at = now();

  SELECT w.balance INTO v_balance FROM public.wallets w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT v_amount, v_balance, v_new_day, v_next;
END $$;

-- 5. Quest RPCs
CREATE OR REPLACE FUNCTION public.progress_quest(p_code text, p_delta int)
RETURNS TABLE(progress int, target int, completed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target int;
  v_active boolean;
  v_progress int;
  v_completed_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_delta IS NULL OR p_delta < 1 OR p_delta > 1000 THEN
    RAISE EXCEPTION 'invalid_delta' USING ERRCODE = '22023';
  END IF;

  SELECT q.target, q.active INTO v_target, v_active
    FROM public.quests q WHERE q.code = p_code;
  IF v_target IS NULL OR NOT v_active THEN
    RAISE EXCEPTION 'quest_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_quests (user_id, quest_code, progress, completed_at, updated_at)
  VALUES (
    v_uid, p_code, LEAST(v_target, p_delta),
    CASE WHEN p_delta >= v_target THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id, quest_code) DO UPDATE
    SET progress = LEAST(v_target, public.user_quests.progress + p_delta),
        completed_at = COALESCE(
          public.user_quests.completed_at,
          CASE WHEN LEAST(v_target, public.user_quests.progress + p_delta) >= v_target
               THEN now() ELSE NULL END
        ),
        updated_at = now()
  RETURNING public.user_quests.progress, v_target, public.user_quests.completed_at
    INTO v_progress, v_target, v_completed_at;

  RETURN QUERY SELECT v_progress, v_target, (v_completed_at IS NOT NULL);
END $$;

CREATE OR REPLACE FUNCTION public.claim_quest(p_code text)
RETURNS TABLE(amount bigint, new_balance bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reward bigint;
  v_active boolean;
  v_completed timestamptz;
  v_claimed timestamptz;
  v_balance bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT q.reward_amount, q.active INTO v_reward, v_active
    FROM public.quests q WHERE q.code = p_code;
  IF v_reward IS NULL OR NOT v_active THEN
    RAISE EXCEPTION 'quest_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT uq.completed_at, uq.claimed_at INTO v_completed, v_claimed
    FROM public.user_quests uq
    WHERE uq.user_id = v_uid AND uq.quest_code = p_code
    FOR UPDATE;

  IF v_completed IS NULL THEN
    RAISE EXCEPTION 'not_completed' USING ERRCODE = 'P0003';
  END IF;
  IF v_claimed IS NOT NULL THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END IF;

  -- Single entry point — amount sourced from server-side quests.reward_amount
  BEGIN
    INSERT INTO public.ledger_entries (user_id, kind, amount, ref_kind, ref_id)
    VALUES (v_uid, 'quest_reward', v_reward, 'quest', p_code);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END;

  UPDATE public.user_quests
    SET claimed_at = now(), updated_at = now()
    WHERE user_id = v_uid AND quest_code = p_code;

  SELECT w.balance INTO v_balance FROM public.wallets w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT v_reward, v_balance;
END $$;
