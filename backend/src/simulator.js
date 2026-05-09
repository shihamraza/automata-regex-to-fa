/**
 * STRING SIMULATOR
 *
 * Theory:
 *   Running a string against a DFA is straightforward:
 *   1. Start at the start state
 *   2. For each character in the input string, follow the transition function
 *   3. If at any point there is no transition (dead state), REJECT
 *   4. After all characters: ACCEPT if current state is an accept state, else REJECT
 *
 *   We also record the full path taken (each state visited) so the frontend
 *   can animate or highlight the traversal step by step.
 */

function simulateString(dfa, inputString) {
  const { start, accepts, transitions, alphabet } = dfa;
  const acceptSet = new Set(accepts);

  const path = [start]; // states visited, including start
  const steps = [];     // detailed step log

  let current = start;

  for (let i = 0; i < inputString.length; i++) {
    const sym = inputString[i];

    // Check if symbol is in alphabet
    if (!alphabet.includes(sym)) {
      steps.push({
        step: i + 1,
        from: current,
        symbol: sym,
        to: null,
        note: `Symbol '${sym}' not in alphabet — REJECT`,
      });
      return {
        accepted: false,
        path,
        steps,
        reason: `Symbol '${sym}' not in alphabet`,
      };
    }

    const next = transitions[current]?.[sym];

    steps.push({
      step: i + 1,
      from: current,
      symbol: sym,
      to: next || 'DEAD',
      note: next ? `δ(${current}, ${sym}) = ${next}` : `No transition — DEAD state`,
    });

    if (next === undefined) {
      return {
        accepted: false,
        path,
        steps,
        reason: `No transition from state ${current} on '${sym}'`,
      };
    }

    current = next;
    path.push(current);
  }

  const accepted = acceptSet.has(current);

  steps.push({
    step: inputString.length + 1,
    from: current,
    symbol: '—',
    to: '—',
    note: accepted
      ? `End of input. State ${current} is an ACCEPT state → ACCEPTED`
      : `End of input. State ${current} is NOT an accept state → REJECTED`,
  });

  return {
    accepted,
    path,
    steps,
    finalState: current,
    reason: accepted ? 'String accepted' : `Final state ${current} is not an accept state`,
  };
}

module.exports = { simulateString };
