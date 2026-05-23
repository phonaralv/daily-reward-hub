/**
 * PHONARA Centralized Error Codes
 *
 * Single source of truth for all application-level error codes.
 * These codes are used across:
 * - Database RPCs (as errcode)
 * - Server Functions
 * - Client error handling
 *
 * Naming: DOMAIN_SPECIFIC_ERROR
 * Keep codes stable once used in production.
 */

export const ErrorCode = {
  // === General ===
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // === Referral Domain ===
  REFERRAL_SELF_REFERRAL: 'REFERRAL_SELF_REFERRAL',
  REFERRAL_ALREADY_REFERRED: 'REFERRAL_ALREADY_REFERRED',
  REFERRAL_CODE_NOT_FOUND: 'REFERRAL_CODE_NOT_FOUND',
  REFERRAL_NOT_FOUND: 'REFERRAL_NOT_FOUND',
  REFERRAL_ALREADY_CLAIMED: 'REFERRAL_ALREADY_CLAIMED',
  REFERRAL_BLOCKED_FRAUD: 'REFERRAL_BLOCKED_FRAUD',
  REFERRAL_REVIEW_REQUIRED: 'REFERRAL_REVIEW_REQUIRED',

  // === Ledger / Reward Domain ===
  LEDGER_ALREADY_CLAIMED: 'LEDGER_ALREADY_CLAIMED',
  LEDGER_INVALID_AMOUNT: 'LEDGER_INVALID_AMOUNT',

  // === Fraud Domain ===
  FRAUD_BLOCKED: 'FRAUD_BLOCKED',
  FRAUD_REVIEW_REQUIRED: 'FRAUD_REVIEW_REQUIRED',

  // === Leaderboard Domain ===
  LEADERBOARD_ALREADY_SETTLED: 'LEADERBOARD_ALREADY_SETTLED',
  LEADERBOARD_PERIOD_NOT_FOUND: 'LEADERBOARD_PERIOD_NOT_FOUND',

  // === Quest / Daily Domain ===
  QUEST_NOT_FOUND: 'QUEST_NOT_FOUND',
  QUEST_NOT_COMPLETED: 'QUEST_NOT_COMPLETED',
  DAILY_ALREADY_CLAIMED: 'DAILY_ALREADY_CLAIMED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
