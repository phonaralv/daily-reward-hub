/**
 * PHONARA Custom ESLint Rules Loader
 *
 * This file loads and registers all custom architecture guard rules.
 */

const noDirectLedgerWrite = require('../rules/no-direct-ledger-write');
const noClientRewardCalculation = require('../rules/no-client-reward-calculation');

module.exports = {
  rules: {
    'phonara/no-direct-ledger-write': noDirectLedgerWrite,
    'phonara/no-client-reward-calculation': noClientRewardCalculation,
  },
};
