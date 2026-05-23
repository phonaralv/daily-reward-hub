/**
 * ESLint Rule: no-direct-ledger-write
 *
 * Prevents direct writes to the `ledger_entries` table.
 * All writes must go through the `_apply_reward()` function or approved RPCs.
 *
 * This is a critical architecture guard to enforce the Single Entry Point principle.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct writes to ledger_entries table. Use _apply_reward() or approved RPCs only.',
      category: 'PHONARA Architecture',
      recommended: false,
    },
    messages: {
      directWrite:
        'ledger_entries 테이블에 직접 쓰기 작업을 할 수 없습니다. ' +
        '반드시 `_apply_reward()` 함수 또는 허용된 RPC를 통해서만 작성해야 합니다.',
    },
    schema: [],
  },

  create(context) {
    return {
      // Detect supabase.from('ledger_entries').insert/update/upsert/delete
      CallExpression(node) {
        const callee = node.callee;

        // Check for .from('ledger_entries')
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'from' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === 'ledger_entries'
        ) {
          // Now check if it's chained with insert/update/upsert/delete
          let current = callee.object;

          // Walk up the chain to find supabase.from(...)
          while (current && current.type === 'CallExpression') {
            if (
              current.callee.type === 'MemberExpression' &&
              current.callee.property.type === 'Identifier' &&
              ['insert', 'update', 'upsert', 'delete'].includes(current.callee.property.name)
            ) {
              context.report({
                node,
                messageId: 'directWrite',
              });
              return;
            }
            current = current.callee.object;
          }
        }

        // Also detect direct supabase.from('ledger_entries').insert etc in one expression
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          ['insert', 'update', 'upsert', 'delete'].includes(callee.property.name)
        ) {
          // Check if the object is a CallExpression to .from('ledger_entries
      }
    };
  },
};
