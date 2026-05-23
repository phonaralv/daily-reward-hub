/**
 * PHONARA Custom ESLint Rules
 *
 * These rules enforce critical architecture invariants that protect
 * the long-term quality and security of the platform.
 */

module.exports = {
  rules: {
    'no-direct-ledger-write': require('./no-direct-ledger-write'),
    // 'no-client-reward-calculation': require('./no-client-reward-calculation'), // TODO: Next
  },
};
