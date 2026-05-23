/**
 * PHONARA Application Error System
 *
 * World-class error handling with:
 * - Structured error codes
 * - Machine-readable + human-friendly messages
 * - Proper cause chaining
 * - Easy client-side handling
 */
import type { ErrorCode } from './error-codes';

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode ?? 400;
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Create an AppError from a database RPC error message.
   * Maps known error patterns to structured AppError.
   */
  static fromRpcError(error: { message?: string; code?: string }): AppError {
    const message = error.message ?? 'Unknown error';

    // Map common RPC error patterns
    if (message.includes('self_referral') || message.includes('REFERRAL_SELF_REFERRAL')) {
      return new AppError({
        code: 'REFERRAL_SELF_REFERRAL',
        message: '자기 자신을 추천할 수 없습니다.',
        statusCode: 400,
      });
    }

    if (message.includes('already_referred') || message.includes('REFERRAL_ALREADY_REFERRED')) {
      return new AppError({
        code: 'REFERRAL_ALREADY_REFERRED',
        message: '이미 추천인을 등록했습니다.',
        statusCode: 409,
      });
    }

    if (message.includes('code_not_found') || message.includes('REFERRAL_CODE_NOT_FOUND')) {
      return new AppError({
        code: 'REFERRAL_CODE_NOT_FOUND',
        message: '존재하지 않는 추천 코드입니다.',
        statusCode: 404,
      });
    }

    if (message.includes('already_claimed') || message.includes('LEDGER_ALREADY_CLAIMED')) {
      return new AppError({
        code: 'LEDGER_ALREADY_CLAIMED',
        message: '이미 보상을 수령했습니다.',
        statusCode: 409,
      });
    }

    if (message.includes('blocked_fraud') || message.includes('FRAUD_BLOCKED')) {
      return new AppError({
        code: 'REFERRAL_BLOCKED_FRAUD',
        message: '사기 의심으로 인해 보상 지급이 제한되었습니다.',
        statusCode: 403,
      });
    }

    // Default fallback
    return new AppError({
      code: 'INTERNAL_ERROR',
      message: message || '알 수 없는 오류가 발생했습니다.',
      statusCode: 500,
    });
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
