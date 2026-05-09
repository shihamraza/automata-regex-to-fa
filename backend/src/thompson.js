/**
 * THOMPSON'S CONSTRUCTION — Regex → NFA
 *
 * Theory:
 *   Thompson's construction converts a regular expression into an NFA by
 *   recursively building small NFAs for each sub-expression and combining them.
 *
 *   Every NFA fragment produced has:
 *     - Exactly ONE start state
 *     - Exactly ONE accept state
 *     - No transitions INTO the start state from within the fragment
 *     - No transitions OUT OF the accept state from within the fragment
 *
 *   This guarantee makes composition (concat, union, star) safe and simple.
 *
 * Rules applied:
 *   1. Literal 'a'  → start --a--> accept
 *   2. ε (epsilon)  → start --ε--> accept
 *   3. P | Q (union)→ new_start --ε--> P.start, Q.start;
 *                      P.accept, Q.accept --ε--> new_accept
 *   4. PQ (concat)  → P.accept merges into Q.start (ε-link)
 *   5. P* (star)    → new_start --ε--> P.start, new_accept;
 *                      P.accept --ε--> P.start, new_accept
 */

let stateCounter = 0;

function newState() {
  return `q${stateCounter++}`;
}

function resetCounter() {
  stateCounter = 0;
}

// Each NFA fragment: { states, start, accept, transitions }
// transitions: { [fromState]: { [symbol]: [toState, ...] } }

function literalNFA(symbol) {
  const start = newState();
  const accept = newState();
  return {
    states: new Set([start, accept]),
    start,
    accept,
    transitions: { [start]: { [symbol]: [accept] } },
  };
}

function epsilonNFA() {
  const start = newState();
  const accept = newState();
  return {
    states: new Set([start, accept]),
    start,
    accept,
    transitions: { [start]: { ε: [accept] } },
  };
}

function addTransition(transitions, from, symbol, to) {
  if (!transitions[from]) transitions[from] = {};
  if (!transitions[from][symbol]) transitions[from][symbol] = [];
  if (!transitions[from][symbol].includes(to)) {
    transitions[from][symbol].push(to);
  }
}

function mergeTransitions(...transList) {
  const merged = {};
  for (const t of transList) {
    for (const [from, symbols] of Object.entries(t)) {
      for (const [sym, tos] of Object.entries(symbols)) {
        for (const to of tos) addTransition(merged, from, sym, to);
      }
    }
  }
  return merged;
}

// Union: P | Q
function unionNFA(p, q) {
  const start = newState();
  const accept = newState();
  const transitions = mergeTransitions(p.transitions, q.transitions);
  addTransition(transitions, start, 'ε', p.start);
  addTransition(transitions, start, 'ε', q.start);
  addTransition(transitions, p.accept, 'ε', accept);
  addTransition(transitions, q.accept, 'ε', accept);
  return {
    states: new Set([start, accept, ...p.states, ...q.states]),
    start,
    accept,
    transitions,
  };
}

// Concatenation: PQ
function concatNFA(p, q) {
  // Link p.accept → q.start via ε, then "merge" them conceptually
  const transitions = mergeTransitions(p.transitions, q.transitions);
  addTransition(transitions, p.accept, 'ε', q.start);
  return {
    states: new Set([...p.states, ...q.states]),
    start: p.start,
    accept: q.accept,
    transitions,
  };
}

// Kleene Star: P*
function starNFA(p) {
  const start = newState();
  const accept = newState();
  const transitions = mergeTransitions(p.transitions);
  addTransition(transitions, start, 'ε', p.start);
  addTransition(transitions, start, 'ε', accept);
  addTransition(transitions, p.accept, 'ε', p.start);
  addTransition(transitions, p.accept, 'ε', accept);
  return {
    states: new Set([start, accept, ...p.states]),
    start,
    accept,
    transitions,
  };
}

// Kleene Plus: P+ = PP*
function plusNFA(p) {
  // We rebuild p by re-parsing so states are distinct; here we just use concat+star trick
  // Actually since p is already built, we clone it conceptually:
  // P+ = concat(P, star(P)) but sharing states causes issues.
  // Correct approach: new_start --ε--> p.start; p.accept --ε--> p.start, new_accept
  const start = newState();
  const accept = newState();
  const transitions = mergeTransitions(p.transitions);
  addTransition(transitions, start, 'ε', p.start);
  addTransition(transitions, p.accept, 'ε', p.start);
  addTransition(transitions, p.accept, 'ε', accept);
  return {
    states: new Set([start, accept, ...p.states]),
    start,
    accept,
    transitions,
  };
}

// Optional: P?
function optionalNFA(p) {
  const start = newState();
  const accept = newState();
  const transitions = mergeTransitions(p.transitions);
  addTransition(transitions, start, 'ε', p.start);
  addTransition(transitions, start, 'ε', accept);
  addTransition(transitions, p.accept, 'ε', accept);
  return {
    states: new Set([start, accept, ...p.states]),
    start,
    accept,
    transitions,
  };
}

// ─── PARSER ────────────────────────────────────────────────────────────────────
// Grammar (operator precedence low → high):
//   expr   → term ('|' term)*
//   term   → factor factor*
//   factor → base ('*' | '+' | '?')*
//   base   → LITERAL | '(' expr ')'
//
// This recursive-descent parser handles:
//   - Literals: a-z, A-Z, 0-9
//   - Grouping: (...)
//   - Union: |
//   - Concatenation: implicit
//   - Star: *
//   - Plus: +
//   - Optional: ?

function parse(regex) {
  resetCounter();
  // Insert explicit '·' concat operator so parser is cleaner
  const tokens = tokenize(regex);
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }
  function expect(c) {
    if (peek() !== c) throw new Error(`Expected '${c}' but got '${peek()}'`);
    consume();
  }

  function parseExpr() {
    let nfa = parseTerm();
    while (peek() === '|') {
      consume();
      const right = parseTerm();
      nfa = unionNFA(nfa, right);
    }
    return nfa;
  }

  function parseTerm() {
    let nfa = parseFactor();
    while (peek() && peek() !== ')' && peek() !== '|') {
      const right = parseFactor();
      nfa = concatNFA(nfa, right);
    }
    return nfa;
  }

  function parseFactor() {
    let nfa = parseBase();
    while (peek() === '*' || peek() === '+' || peek() === '?') {
      const op = consume();
      if (op === '*') nfa = starNFA(nfa);
      else if (op === '+') nfa = plusNFA(nfa);
      else if (op === '?') nfa = optionalNFA(nfa);
    }
    return nfa;
  }

  function parseBase() {
    const t = peek();
    if (t === '(') {
      consume();
      const nfa = parseExpr();
      expect(')');
      return nfa;
    } else if (t === 'ε') {
      consume();
      return epsilonNFA();
    } else if (t && t !== ')' && t !== '|' && t !== '*' && t !== '+' && t !== '?') {
      consume();
      return literalNFA(t);
    } else {
      throw new Error(`Unexpected token: '${t}'`);
    }
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Unexpected characters at end of regex');
  return result;
}

function tokenize(regex) {
  // Simple character-by-character tokenization
  // Handles escaped characters and multi-char tokens if needed
  const tokens = [];
  let i = 0;
  while (i < regex.length) {
    const c = regex[i];
    if (c === '\\' && i + 1 < regex.length) {
      tokens.push(regex[i + 1]); // escaped literal
      i += 2;
    } else {
      tokens.push(c);
      i++;
    }
  }
  return tokens;
}

// ─── EXPORT ────────────────────────────────────────────────────────────────────

function buildNFA(regex) {
  const nfa = parse(regex);
  // Serialize for transport
  return {
    states: Array.from(nfa.states),
    start: nfa.start,
    accept: nfa.accept,
    transitions: nfa.transitions,
    // Collect alphabet (all symbols except ε)
    alphabet: collectAlphabet(nfa.transitions),
  };
}

function collectAlphabet(transitions) {
  const alpha = new Set();
  for (const syms of Object.values(transitions)) {
    for (const sym of Object.keys(syms)) {
      if (sym !== 'ε') alpha.add(sym);
    }
  }
  return Array.from(alpha).sort();
}

module.exports = { buildNFA };
