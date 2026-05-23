
-- ============================================================
-- _apply_reward — the ONLY function that inserts ledger_entries.
-- Applies VIP multiplier server-side. Returns final credited amount.
-- Bubbles unique_violation up to caller for idempotency handling.
-- ============================================================
CREATE OR REPLACE FUNCTION public._apply_reward(
  p_user uuid,
  p_kind public.ledger_kind,
  p_base bigint,
  p_ref_kind text,
  p_ref_id text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mult numeric;
  v_final bigint;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  IF p_base IS NULL OR p_base < 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;
  v_mult := public.vip_multiplier(p_user);
  v_final := FLOOR(p_base::numeric * v_mult)::bigint;
  INSERT INTO public.ledger_entries (user_id, kind, amount, ref_kind, ref_id)
  VALUES (p_user, p_kind, v_final, p_ref_kind, p_ref_id);
  RETURN v_final;
END $$;

-- Internal — never callable by clients.
REVOKE ALL ON FUNCTION public._apply_reward(uuid, public.ledger_kind, bigint, text, text)
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- VIP tier + multiplier
-- ============================================================
-- Tier: 0–5 based on last-30-day positive ledger sum (PHON earned).
-- Thresholds: 0=0, 1=1k, 2=5k, 3=20k, 4=75k, 5=250k.
CREATE OR REPLACE FUNCTION public.vip_tier(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.ledger_entries
    WHERE user_id = p_user_id
      AND amount > 0
      AND created_at >= now() - INTERVAL '30 days';
  RETURN CASE
    WHEN v_total >= 250000 THEN 5
    WHEN v_total >=  75000 THEN 4
    WHEN v_total >=  20000 THEN 3
    WHEN v_total >=   5000 THEN 2
    WHEN v_total >=   1000 THEN 1
    ELSE 0
  END;
END $$;

CREATE OR REPLACE FUNCTION public.vip_multiplier(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier int := public.vip_tier(p_user_id);
BEGIN
  RETURN CASE v_tier
    WHEN 5 THEN 1.50
    WHEN 4 THEN 1.25
    WHEN 3 THEN 1.15
    WHEN 2 THEN 1.10
    WHEN 1 THEN 1.05
    ELSE 1.00
  END;
END $$;

REVOKE ALL ON FUNCTION public.vip_tier(uuid)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vip_multiplier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vip_tier(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.vip_multiplier(uuid) TO authenticated;

-- ============================================================
-- Refactor existing claim RPCs to route through _apply_reward.
-- ============================================================
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
  v_base bigint;
  v_paid bigint;
  v_balance bigint;
  v_next bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT current_day, last_claim_date
    INTO v_prev_day, v_prev_date
    FROM public.streaks WHERE user_id = v_uid FOR UPDATE;

  IF v_prev_date IS NULL THEN
    v_new_day := 1;
  ELSIF v_prev_date = v_today THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  ELSIF v_prev_date = v_today - INTERVAL '1 day' THEN
    v_new_day := (v_prev_day % 7) + 1;
  ELSE
    v_new_day := 1;
  END IF;

  v_base := public.streak_reward_amount(v_new_day);
  v_next := public.streak_reward_amount((v_new_day % 7) + 1);

  BEGIN
    v_paid := public._apply_reward(v_uid, 'daily_reward', v_base, 'daily_reward', v_ref);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END;

  INSERT INTO public.streaks (user_id, current_day, last_claim_date, longest, updated_at)
  VALUES (v_uid, v_new_day, v_today, v_new_day, now())
  ON CONFLICT (user_id) DO UPDATE
    SET current_day = EXCLUDED.current_day,
        last_claim_date = EXCLUDED.last_claim_date,
        longest = GREATEST(public.streaks.longest, EXCLUDED.current_day),
        updated_at = now();

  SELECT w.balance INTO v_balance FROM public.wallets w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT v_paid, v_balance, v_new_day, v_next;
END $$;

DROP FUNCTION IF EXISTS public.claim_quest(text);
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
  v_paid bigint;
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

  BEGIN
    v_paid := public._apply_reward(v_uid, 'quest_reward', v_reward, 'quest', p_code);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END;

  UPDATE public.user_quests
    SET claimed_at = now(), updated_at = now()
    WHERE user_id = v_uid AND quest_code = p_code;

  SELECT w.balance INTO v_balance FROM public.wallets w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT v_paid, v_balance;
END $$;

REVOKE ALL ON FUNCTION public.claim_daily_reward()    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_quest(text)       FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quest(text)    TO authenticated;

-- ============================================================
-- Referral RPCs
-- ============================================================
-- Generates a unique 6-char base32 code (idempotent per user).
CREATE OR REPLACE FUNCTION public.create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing text;
  v_code text;
  v_attempts int := 0;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I/L
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT code INTO v_existing FROM public.referral_codes WHERE user_id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;
  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + (floor(random()*length(v_alphabet)))::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'code_generation_failed' USING ERRCODE = 'P0004';
      END IF;
    END;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.create_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_referral_code() TO authenticated;

-- Referee enters referrer's code. Inserts pending referral.
-- Reward is NOT paid here — claim_referral_reward does that after fraud check.
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS TABLE(referrer_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referee uuid := auth.uid();
  v_referrer uuid;
  v_exists uuid;
BEGIN
  IF v_referee IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_code IS NULL OR length(p_code) <> 6 THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = '22023';
  END IF;
  SELECT user_id INTO v_referrer FROM public.referral_codes
    WHERE code = upper(p_code);
  IF v_referrer IS NULL THEN
    RAISE EXCEPTION 'code_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_referrer = v_referee THEN
    RAISE EXCEPTION 'self_referral' USING ERRCODE = 'P0005';
  END IF;
  -- One referrer per referee
  SELECT referrer_id INTO v_exists FROM public.referrals WHERE referee_id = v_referee;
  IF v_exists IS NOT NULL THEN
    RAISE EXCEPTION 'already_referred' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, code, status)
  VALUES (v_referrer, v_referee, upper(p_code), 'pending');

  RETURN QUERY SELECT v_referrer, 'pending'::text;
END $$;

REVOKE ALL ON FUNCTION public.redeem_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;

-- Record fingerprint — combines client visitor_id with server-derived IP/UA hash.
-- The two-source design defends against pure-client spoofing.
CREATE OR REPLACE FUNCTION public.record_fingerprint(p_visitor_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_headers jsonb;
  v_ip text;
  v_ua text;
  v_ip_hash text;
  v_ua_hash text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_visitor_id IS NULL OR length(p_visitor_id) < 8 OR length(p_visitor_id) > 128 THEN
    RAISE EXCEPTION 'invalid_visitor_id' USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::jsonb;
  END;
  v_ip := COALESCE(v_headers->>'x-forwarded-for', v_headers->>'cf-connecting-ip', '');
  v_ua := COALESCE(v_headers->>'user-agent', '');
  -- sha256 hex (pgcrypto from pg_catalog); fall back gracefully if extension missing.
  BEGIN
    v_ip_hash := CASE WHEN v_ip = '' THEN NULL
                      ELSE encode(digest(v_ip, 'sha256'), 'hex') END;
    v_ua_hash := CASE WHEN v_ua = '' THEN NULL
                      ELSE encode(digest(v_ua, 'sha256'), 'hex') END;
  EXCEPTION WHEN OTHERS THEN
    v_ip_hash := NULL; v_ua_hash := NULL;
  END;

  INSERT INTO public.device_fingerprints
    (user_id, visitor_id, ip_hash, ua_hash, first_seen, last_seen, hit_count)
  VALUES (v_uid, p_visitor_id, v_ip_hash, v_ua_hash, now(), now(), 1)
  ON CONFLICT (user_id, visitor_id) DO UPDATE
    SET last_seen = now(),
        hit_count = public.device_fingerprints.hit_count + 1,
        ip_hash = COALESCE(EXCLUDED.ip_hash, public.device_fingerprints.ip_hash),
        ua_hash = COALESCE(EXCLUDED.ua_hash, public.device_fingerprints.ua_hash);
END $$;

REVOKE ALL ON FUNCTION public.record_fingerprint(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_fingerprint(text) TO authenticated;

-- Fraud evaluator — server-only. Returns 'ok' | 'review' | 'block'.
-- Side effects: appends fraud_signals rows when rules fire.
CREATE OR REPLACE FUNCTION public.evaluate_referral_fraud(
  p_referrer uuid,
  p_referee uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shared int;
  v_ip_velocity int;
  v_age_minutes int;
  v_high_sigs int;
  v_result text := 'ok';
BEGIN
  -- R1: shared visitor_id between referrer & referee → block.
  SELECT count(*) INTO v_shared
    FROM public.device_fingerprints a
    JOIN public.device_fingerprints b USING (visitor_id)
    WHERE a.user_id = p_referrer AND b.user_id = p_referee;
  IF v_shared > 0 THEN
    INSERT INTO public.fraud_signals (user_id, kind, rule_code, severity, payload)
    VALUES (p_referrer, 'referral', 'R1', 'high',
            jsonb_build_object('referee', p_referee, 'shared_devices', v_shared));
    v_result := 'block';
  END IF;

  -- R2: same ip_hash referees > 3 in last 24h → block.
  SELECT count(DISTINCT r.referee_id) INTO v_ip_velocity
    FROM public.referrals r
    JOIN public.device_fingerprints f ON f.user_id = r.referee_id
    WHERE r.referrer_id = p_referrer
      AND r.created_at >= now() - INTERVAL '24 hours'
      AND f.ip_hash IS NOT NULL
      AND f.ip_hash IN (
        SELECT ip_hash FROM public.device_fingerprints
        WHERE user_id = p_referee AND ip_hash IS NOT NULL
      );
  IF v_ip_velocity > 3 THEN
    INSERT INTO public.fraud_signals (user_id, kind, rule_code, severity, payload)
    VALUES (p_referrer, 'referral', 'R2', 'high',
            jsonb_build_object('referee', p_referee, 'ip_velocity', v_ip_velocity));
    v_result := 'block';
  END IF;

  -- R3: referee signed up < 1h before redeem → review (not block).
  SELECT EXTRACT(EPOCH FROM (now() - p.created_at))::int / 60 INTO v_age_minutes
    FROM public.profiles p WHERE p.id = p_referee;
  IF v_age_minutes IS NOT NULL AND v_age_minutes < 60 THEN
    INSERT INTO public.fraud_signals (user_id, kind, rule_code, severity, payload)
    VALUES (p_referrer, 'referral', 'R3', 'med',
            jsonb_build_object('referee', p_referee, 'signup_age_minutes', v_age_minutes));
    IF v_result = 'ok' THEN v_result := 'review'; END IF;
  END IF;

  -- R4: referrer already has high-severity history → block.
  SELECT count(*) INTO v_high_sigs
    FROM public.fraud_signals
    WHERE user_id = p_referrer AND severity = 'high'
      AND created_at >= now() - INTERVAL '30 days';
  IF v_high_sigs > 0 THEN
    v_result := 'block';
  END IF;

  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.evaluate_referral_fraud(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- Claim referral reward — called by referrer after fraud check.
-- Base amount: 500 PHON per successful referral (server-controlled).
CREATE OR REPLACE FUNCTION public.claim_referral_reward(p_referee uuid)
RETURNS TABLE(amount bigint, new_balance bigint, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ref_status text;
  v_fraud text;
  v_base bigint := 500;
  v_paid bigint;
  v_balance bigint;
  v_ref_row_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, status INTO v_ref_row_id, v_ref_status
    FROM public.referrals
    WHERE referrer_id = v_uid AND referee_id = p_referee
    FOR UPDATE;
  IF v_ref_row_id IS NULL THEN
    RAISE EXCEPTION 'referral_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_ref_status = 'rewarded' THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END IF;
  IF v_ref_status = 'fraud' THEN
    RAISE EXCEPTION 'blocked_fraud' USING ERRCODE = 'P0006';
  END IF;

  v_fraud := public.evaluate_referral_fraud(v_uid, p_referee);
  IF v_fraud = 'block' THEN
    UPDATE public.referrals SET status = 'fraud' WHERE id = v_ref_row_id;
    RETURN QUERY SELECT 0::bigint, 0::bigint, 'fraud'::text;
    RETURN;
  END IF;
  IF v_fraud = 'review' THEN
    UPDATE public.referrals SET status = 'review' WHERE id = v_ref_row_id;
    RETURN QUERY SELECT 0::bigint, 0::bigint, 'review'::text;
    RETURN;
  END IF;

  BEGIN
    v_paid := public._apply_reward(
      v_uid, 'referral_reward', v_base, 'referral', p_referee::text
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = 'P0001';
  END;

  UPDATE public.referrals
    SET status = 'rewarded', rewarded_at = now()
    WHERE id = v_ref_row_id;

  SELECT w.balance INTO v_balance FROM public.wallets w WHERE w.user_id = v_uid;
  RETURN QUERY SELECT v_paid, v_balance, 'rewarded'::text;
END $$;

REVOKE ALL ON FUNCTION public.claim_referral_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_reward(uuid) TO authenticated;

-- ============================================================
-- Leaderboard settlement — idempotent via UNIQUE on ledger_entries.
-- Pays top 10 with curve [3000,2000,1500,1000,800,600,500,400,300,200].
-- ============================================================
CREATE OR REPLACE FUNCTION public.settle_leaderboard(p_period_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settled timestamptz;
  v_count int := 0;
  v_rec record;
  v_curve bigint[] := ARRAY[3000,2000,1500,1000,800,600,500,400,300,200];
  v_base bigint;
  v_ref_id text;
BEGIN
  -- Advisory lock by period id (uses lower 32 bits of uuid hash).
  PERFORM pg_advisory_xact_lock(hashtext(p_period_id::text));

  SELECT settled_at INTO v_settled
    FROM public.leaderboard_periods
    WHERE id = p_period_id FOR UPDATE;
  IF v_settled IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- Rank entries by score DESC.
  WITH ranked AS (
    SELECT user_id, score,
           ROW_NUMBER() OVER (ORDER BY score DESC, user_id ASC) AS rn
    FROM public.leaderboard_entries
    WHERE period_id = p_period_id
  )
  UPDATE public.leaderboard_entries le
    SET rank = ranked.rn,
        reward_amount = CASE
          WHEN ranked.rn <= 10 THEN v_curve[ranked.rn]
          ELSE 0
        END,
        updated_at = now()
    FROM ranked
    WHERE le.period_id = p_period_id AND le.user_id = ranked.user_id;

  FOR v_rec IN
    SELECT user_id, rank, reward_amount FROM public.leaderboard_entries
      WHERE period_id = p_period_id AND reward_amount > 0
      ORDER BY rank ASC
  LOOP
    v_base := v_rec.reward_amount;
    v_ref_id := 'lb:' || p_period_id::text || ':' || v_rec.rank::text;
    BEGIN
      PERFORM public._apply_reward(
        v_rec.user_id, 'leaderboard_reward', v_base, 'leaderboard', v_ref_id
      );
      v_count := v_count + 1;
    EXCEPTION WHEN unique_violation THEN
      -- already paid (idempotent re-run)
      NULL;
    END;
  END LOOP;

  UPDATE public.leaderboard_periods SET settled_at = now() WHERE id = p_period_id;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.settle_leaderboard(uuid) FROM PUBLIC, anon, authenticated;
-- Only service role (server route handler) calls this.
