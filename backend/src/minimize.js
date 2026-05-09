/**
 * DFA MINIMIZATION — Hopcroft's Algorithm
 *
 * Theory:
 *   Many DFAs produced by subset construction contain redundant states —
 *   states that are "equivalent" because they accept/reject the same set
 *   of future strings.
 *
 *   Two states p and q are DISTINGUISHABLE if there exists some string w
 *   such that one of δ*(p,w) or δ*(q,w) is accepting and the other is not.
 *
 *   Hopcroft's Algorithm (Partition Refinement):
 *   1. Start with two groups: accepting states (F) and non-accepting (Q \ F)
 *   2. Repeatedly split groups: if two states in the same group transition
 *      on symbol 'a' to states in DIFFERENT groups, they must be split apart
 *   3. When no more splits are possible, each group = one minimized state
 *   4. Build the new DFA from the final partition
 *
 *   States that are unreachable from the start state are removed first.
 */

function reachableStates(dfa) {
  const { start, transitions, states } = dfa;
  const reachable = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const s = queue.shift();
    for (const sym of Object.keys(transitions[s] || {})) {
      const t = transitions[s][sym];
      if (!reachable.has(t)) {
        reachable.add(t);
        queue.push(t);
      }
    }
  }
  return reachable;
}

function minimizeDFA(dfa) {
  const { alphabet, accepts, transitions } = dfa;

  // Step 1: Remove unreachable states
  const reachable = reachableStates(dfa);
  const acceptSet = new Set(accepts.filter(s => reachable.has(s)));
  const nonAcceptSet = new Set([...reachable].filter(s => !acceptSet.has(s)));

  // Step 2: Initial partition
  // Each partition is a Set of state names
  let partitions = [];
  if (acceptSet.size > 0) partitions.push(acceptSet);
  if (nonAcceptSet.size > 0) partitions.push(nonAcceptSet);

  // Helper: find which partition a state belongs to (return index)
  function partitionOf(state) {
    return partitions.findIndex(p => p.has(state));
  }

  // Step 3: Refine partitions until stable
  let changed = true;
  while (changed) {
    changed = false;
    const newPartitions = [];
    for (const group of partitions) {
      if (group.size === 1) {
        newPartitions.push(group);
        continue;
      }
      // Try to split this group on each symbol
      // States in the same group must all go to the same partition on each symbol
      const stateList = Array.from(group);
      const signatures = new Map(); // signature → [states]

      for (const state of stateList) {
        // Signature: for each symbol, which partition does the transition land in?
        // -1 means no transition (dead state)
        const sig = alphabet.map(sym => {
          const target = transitions[state]?.[sym];
          if (target === undefined) return -1;
          return partitionOf(target);
        }).join(',');
        if (!signatures.has(sig)) signatures.set(sig, []);
        signatures.get(sig).push(state);
      }

      if (signatures.size === 1) {
        // No split needed
        newPartitions.push(group);
      } else {
        // Split the group
        changed = true;
        for (const states of signatures.values()) {
          newPartitions.push(new Set(states));
        }
      }
    }
    partitions = newPartitions;
  }

  // Step 4: Build minimized DFA from final partitions
  // Representative of each partition = first state alphabetically
  function representative(partition) {
    return Array.from(partition).sort()[0];
  }

  // Assign clean names: M0, M1, ...
  const partitionNames = new Map(); // rep → name
  let idx = 0;
  // Ensure start state's partition is M0
  const startPartition = partitions.find(p => p.has(dfa.start));
  partitionNames.set(representative(startPartition), `M${idx++}`);
  for (const p of partitions) {
    const rep = representative(p);
    if (!partitionNames.has(rep)) {
      partitionNames.set(rep, `M${idx++}`);
    }
  }

  function nameOf(state) {
    for (const p of partitions) {
      if (p.has(state)) {
        return partitionNames.get(representative(p));
      }
    }
    return null;
  }

  const minStart = nameOf(dfa.start);
  const minAccepts = new Set();
  const minTransitions = {};
  const minStates = new Set();

  for (const p of partitions) {
    const rep = Array.from(p).sort()[0];
    const name = partitionNames.get(rep);
    minStates.add(name);

    if (acceptSet.has(rep)) minAccepts.add(name);

    for (const sym of alphabet) {
      const target = transitions[rep]?.[sym];
      if (target !== undefined) {
        if (!minTransitions[name]) minTransitions[name] = {};
        minTransitions[name][sym] = nameOf(target);
      }
    }
  }

  // Map: which original DFA states does each minimized state represent?
  const stateContents = {};
  for (const p of partitions) {
    const rep = Array.from(p).sort()[0];
    const name = partitionNames.get(rep);
    stateContents[name] = Array.from(p).sort();
  }

  return {
    states: Array.from(minStates).sort(),
    start: minStart,
    accepts: Array.from(minAccepts),
    transitions: minTransitions,
    alphabet,
    stateContents,
  };
}

module.exports = { minimizeDFA };
