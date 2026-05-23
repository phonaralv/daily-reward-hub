/**
 * ESLint Rule: no-client-reward-calculation
 *
 * Prevents client-side code from calculating rewards, amounts, multipliers, or PnL.
 * All financial/reward calculations must happen on the server (via _apply_reward or RPCs).
 *
 * This protects the core security principle: Client cannot be trusted with value calculations.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow client-side reward/amount/PnL calculation. All value calculations must be done on the server.',
      category: 'PHONARA Architecture',
      recommended: false,
    },
    messages: {
      clientCalculation:
        '클라이언트에서 보상, 금액, multiplier, PnL 등을 직접 계산할 수 없습니다. ' +
        '모든 가치 계산은 반드시 서버(_apply_reward 또는 RPC)에서 수행해야 합니다.',
    },
    schema: [],
  },

  create(context) {
    // List of dangerous patterns that indicate client-side reward calculation
    const dangerousIdentifiers = [
      'reward',
      'amount',
      'multiplier',
      'pnl',
      'realizedPnl',
      'unrealizedPnl',
      'calculateReward',
      'computeAmount',
    ];

    return {
      // Detect variable declarations or assignments that look like reward calculations
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') {
          const name = node.id.name.toLowerCase();

          if (dangerousIdentifiers.some((keyword) => name.includes(keyword))) {
            // Check if it's in a client-side file (rough heuristic)
            const filename = context.getFilename();
            if (!filename.includes('/src/lib/') && !filename.includes('/src/server')) {
              context.report({
                node,
                messageId: 'clientCalculation',
              });
            }
          }
        }
      },

      // Detect function calls that look like reward calculation
      CallExpression(node) {
        if (node.callee.type === 'Identifier') {
          const name = node.callee.name.toLowerCase();
          if (dangerousIdentifiers.some((keyword) => name.includes(keyword))) {
            context.report({
                node,
                messageId: 'clientCalculation',
            });
          }
        }
      },
    };
  },
};
