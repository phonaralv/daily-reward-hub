
-- Phase 3 (1/2): ENUM extension + new tables + RLS + publication.
-- RPCs land in Phase 3 (2/2) because new enum values cannot be referenced
-- in the same transaction in which they are added.

ALTER TYPE public.ledger_kind ADD VALUE IF NOT EXISTS 'referral_reward';
ALTER TYPE public.ledger_kind ADD VALUE IF NOT EXISTS 'vip_bonus';
ALTER TYPE public.ledger_kind ADD VALUE IF NOT EXISTS 'leaderboard_reward';

-- ============================================================
-- Referral
-- ============================================================
CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY referral_codes_self_select ON public.referral_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','rewarded','fraud','review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  CHECK (referrer_id <> referee_id)
);
CREATE INDEX referrals_referrer_idx ON public.referrals(referrer_id);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY referrals_self_select ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- ============================================================
-- Fraud detection — fingerprints + signals
-- ============================================================
CREATE TABLE public.device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  ip_hash text,
  ua_hash text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  hit_count int NOT NULL DEFAULT 1,
  UNIQUE (user_id, visitor_id)
);
CREATE INDEX device_fingerprints_visitor_idx ON public.device_fingerprints(visitor_id);
CREATE INDEX device_fingerprints_ip_idx ON public.device_fingerprints(ip_hash);
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY fingerprints_self_select ON public.device_fingerprints
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,           -- 'referral' | 'claim' | ...
  rule_code text NOT NULL,      -- 'R1' | 'R2' | 'R3' | 'R4' | ...
  severity text NOT NULL CHECK (severity IN ('low','med','high')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fraud_signals_user_idx ON public.fraud_signals(user_id, created_at DESC);
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
-- Users may see only their own LOW/MED signals (transparency without leaking high-risk detail).
CREATE POLICY fraud_signals_self_select ON public.fraud_signals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND severity IN ('low','med'));

-- ============================================================
-- Leaderboard
-- ============================================================
CREATE TABLE public.leaderboard_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('weekly','monthly')),
  starts_at timestamptz NOT NULL,
  ends_at   timestamptz NOT NULL,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, starts_at, ends_at),
  CHECK (ends_at > starts_at)
);
ALTER TABLE public.leaderboard_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY leaderboard_periods_public_select ON public.leaderboard_periods
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.leaderboard_entries (
  period_id uuid NOT NULL REFERENCES public.leaderboard_periods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score bigint NOT NULL DEFAULT 0,
  rank int,
  reward_amount bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (period_id, user_id)
);
CREATE INDEX leaderboard_entries_period_score_idx
  ON public.leaderboard_entries(period_id, score DESC);
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY leaderboard_entries_public_select ON public.leaderboard_entries
  FOR SELECT TO authenticated USING (true);

-- Realtime: rank/score changes push to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_entries;
