/**
 * SUBSET CONSTRUCTION — NFA → DFA
 *
 * Theory:
 *   An NFA can be in multiple states simultaneously. The subset construction
 *   algorithm simulates this by treating SETS of NFA states as single DFA states.
 *
 *   Key operations:
 *   1. ε-closure(S): the set of all NFA states reachable from any state in S
 *                    by following ONLY ε-transitions (zero or more)
 *   2. move(S, a):   the set of NFA states reachable from any state in S
 *                    by following ONE transition on symbol 'a'
 *
 *   Algorithm:
 *     - Start: DFA start = ε-closure({NFA.start})
 *     - For each unmarked DFA state D and each input symbol a:
 *         T = ε-closure(move(D, a))
 *         Add T as a new DFA state if not seen before
 *         Record transition D --a--> T
 *     - A DFA state is ACCEPTING if it contains the NFA accept state
 */

function epsilonClosure(states, transitions) {
  // BFS/DFS over ε-transitions
  const closure = new Set(states);
  const stack = [...states];
  while (stack.length > 0) {
    const s = stack.pop();
    const epsTrans = transitions[s]?.['ε'] || [];
    for (const t of epsTrans) {
      if (!closure.has(t)) {
        closure.add(t);
        stack.push(t);
      }
    }
  }
  return closure;
}

function move(states, symbol, transitions) {
  // All states reachable from 'states' on 'symbol' (no ε)
  const result = new Set();
  for (const s of states) {
    const targets = transitions[s]?.[symbol] || [];
    for (const t of targets) result.add(t);
  }
  return result;
}

function setKey(set) {
  // Deterministic string key for a set of states (for use as Map key)
  return Array.from(set).sort().join(',');
}

function buildDFA(nfa) {
  const { transitions: nfaTrans, start: nfaStart, accept: nfaAccept, alphabet } = nfa;

  // DFA state = ε-closure of a set of NFA states
  const startClosure = epsilonClosure([nfaStart], nfaTrans);
  const startKey = setKey(startClosure);

  // Map from set-key → DFA state name
  const dfaStateMap = new Map();
  // Map from DFA state name → which NFA states it contains
  const dfaStateContents = {};

  let stateCounter = 0;
  function nameFor(key, nfaStates) {
    if (!dfaStateMap.has(key)) {
      const name = `D${stateCounter++}`;
      dfaStateMap.set(key, name);
      dfaStateContents[name] = Array.from(nfaStates).sort();
    }
    return dfaStateMap.get(key);
  }

  const dfaStart = nameFor(startKey, startClosure);

  const dfaTransitions = {};
  const dfaAccepts = new Set();
  const worklist = [{ key: startKey, closure: startClosure }];
  const visited = new Set([startKey]);

  while (worklist.length > 0) {
    const { key, closure } = worklist.shift();
    const dfaState = dfaStateMap.get(key);

    // Is this DFA state accepting?
    if (closure.has(nfaAccept)) {
      dfaAccepts.add(dfaState);
    }

    // For each input symbol, compute the next DFA state
    for (const sym of alphabet) {
      const moved = move(closure, sym, nfaTrans);
      if (moved.size === 0) continue; // dead state — skip (or add explicit dead state)

      const nextClosure = epsilonClosure(moved, nfaTrans);
      const nextKey = setKey(nextClosure);
      const nextState = nameFor(nextKey, nextClosure);

      if (!dfaTransitions[dfaState]) dfaTransitions[dfaState] = {};
      dfaTransitions[dfaState][sym] = nextState;

      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        worklist.push({ key: nextKey, closure: nextClosure });
      }
    }
  }

  const dfaStates = Array.from(dfaStateMap.values());

  return {
    states: dfaStates,
    start: dfaStart,
    accepts: Array.from(dfaAccepts),
    transitions: dfaTransitions,
    alphabet,
    // For educational display: show which NFA states each DFA state represents
    stateContents: dfaStateContents,
  };
}

module.exports = { buildDFA };
