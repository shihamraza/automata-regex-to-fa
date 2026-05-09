import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import './App.css';

const API = 'http://localhost:3001/api';

// ─── DAGRE LAYOUT ──────────────────────────────────────────────────────────────
function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 50 });

  nodes.forEach(n => g.setNode(n.id, { width: 60, height: 60 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 30, y: pos.y - 30 } };
  });
}

// ─── AUTOMATA → REACT-FLOW CONVERTER ──────────────────────────────────────────
function automataToFlow(automata, type, highlightPath = []) {
  if (!automata) return { nodes: [], edges: [] };

  const isNFA = type === 'nfa';
  const states = automata.states || [];
  const start = automata.start;
  const accepts = new Set(isNFA ? [automata.accept] : (automata.accepts || []));
  const transitions = automata.transitions || {};
  const highlightSet = new Set(highlightPath);

  // Build nodes
  const rawNodes = states.map(state => ({
    id: state,
    type: 'default',
    data: {
      label: (
        <StateLabel
          name={state}
          isStart={state === start}
          isAccept={accepts.has(state)}
          isHighlighted={highlightSet.has(state)}
        />
      ),
    },
    style: nodeStyle(state === start, accepts.has(state), highlightSet.has(state)),
  }));

  // Build edges — group multi-symbol transitions between same pair
  const edgeMap = {};
  for (const [from, syms] of Object.entries(transitions)) {
    for (const [sym, targets] of Object.entries(syms)) {
      const toList = Array.isArray(targets) ? targets : [targets];
      for (const to of toList) {
        const key = `${from}__${to}`;
        if (!edgeMap[key]) edgeMap[key] = { from, to, labels: [] };
        edgeMap[key].labels.push(sym === 'ε' ? 'ε' : sym);
      }
    }
  }

  const rawEdges = Object.entries(edgeMap).map(([key, { from, to, labels }]) => {
    const isSelf = from === to;
    const isHighlightedEdge = highlightSet.has(from) && highlightSet.has(to);
    return {
      id: key,
      source: from,
      target: to,
      label: labels.sort().join(', '),
      type: isSelf ? 'selfConnecting' : 'smoothstep',
      animated: isHighlightedEdge,
      markerEnd: { type: MarkerType.ArrowClosed, color: isHighlightedEdge ? '#f59e0b' : '#64748b' },
      style: {
        stroke: isHighlightedEdge ? '#f59e0b' : '#64748b',
        strokeWidth: isHighlightedEdge ? 2.5 : 1.5,
      },
      labelStyle: {
        fill: labels.includes('ε') ? '#a78bfa' : '#e2e8f0',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 500,
      },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
      labelBgPadding: [4, 6],
      labelBgBorderRadius: 4,
    };
  });

  const laid = layoutGraph(rawNodes, rawEdges);
  return { nodes: laid, edges: rawEdges };
}

function nodeStyle(isStart, isAccept, isHighlighted) {
  return {
    width: 60,
    height: 60,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: isHighlighted
      ? '3px solid #f59e0b'
      : isAccept
        ? '3px solid #34d399'
        : isStart
          ? '3px solid #60a5fa'
          : '2px solid #334155',
    background: isHighlighted
      ? 'rgba(245,158,11,0.15)'
      : isAccept
        ? 'rgba(52,211,153,0.1)'
        : isStart
          ? 'rgba(96,165,250,0.1)'
          : '#1e293b',
    boxShadow: isHighlighted
      ? '0 0 20px rgba(245,158,11,0.4)'
      : isAccept
        ? '0 0 12px rgba(52,211,153,0.3)'
        : 'none',
    transition: 'all 0.3s ease',
  };
}

function StateLabel({ name, isStart, isAccept, isHighlighted }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        color: isHighlighted ? '#f59e0b' : isAccept ? '#34d399' : isStart ? '#60a5fa' : '#94a3b8',
        fontWeight: 600,
        lineHeight: 1,
      }}>
        {isAccept && <span style={{ fontSize: 8, display: 'block', marginBottom: 2 }}>●</span>}
        {name}
        {isStart && <span style={{ fontSize: 8, display: 'block', marginTop: 2, color: '#60a5fa' }}>▶</span>}
      </div>
    </div>
  );
}

// ─── AUTOMATA GRAPH PANEL ──────────────────────────────────────────────────────
function AutomataPanel({ data, type, title, highlightPath }) {
  const { nodes: initNodes, edges: initEdges } = automataToFlow(data, type, highlightPath);
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = automataToFlow(data, type, highlightPath);
    setNodes(n);
    setEdges(e);
  }, [data, highlightPath]);

  const isNFA = type === 'nfa';
  const stateCount = data?.states?.length || 0;
  const acceptCount = isNFA ? 1 : (data?.accepts?.length || 0);

  return (
    <div className="automata-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <span className="panel-badge">{type.toUpperCase()}</span>
          <h3 className="panel-title">{title}</h3>
        </div>
        <div className="panel-stats">
          <span className="stat"><span className="stat-n">{stateCount}</span> states</span>
          <span className="stat"><span className="stat-n">{acceptCount}</span> accept</span>
          {data?.alphabet && (
            <span className="stat">Σ = {'{' + data.alphabet.join(',') + '}'}</span>
          )}
        </div>
      </div>
      <div className="graph-container">
        {data ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls showInteractive={false} style={{ background: '#1e293b', border: '1px solid #334155' }} />
          </ReactFlow>
        ) : (
          <div className="graph-empty">Enter a regex above to generate</div>
        )}
      </div>
    </div>
  );
}

// ─── TRANSITION TABLE ──────────────────────────────────────────────────────────
function TransitionTable({ data, type }) {
  if (!data) return null;
  const isNFA = type === 'nfa';
  const states = data.states || [];
  const alphabet = data.alphabet || [];
  const symbols = isNFA ? [...alphabet, 'ε'] : alphabet;
  const start = data.start;
  const accepts = new Set(isNFA ? [data.accept] : (data.accepts || []));

  return (
    <div className="table-wrap">
      <table className="transition-table">
        <thead>
          <tr>
            <th>State</th>
            {symbols.map(s => (
              <th key={s} className={s === 'ε' ? 'epsilon-col' : ''}>{s === 'ε' ? 'ε' : s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map(state => (
            <tr key={state} className={accepts.has(state) ? 'accept-row' : ''}>
              <td className="state-cell">
                {state === start && <span className="arrow-marker">→</span>}
                {accepts.has(state) && <span className="accept-marker">*</span>}
                {state}
              </td>
              {symbols.map(sym => {
                const val = data.transitions[state]?.[sym];
                const display = Array.isArray(val) ? `{${val.join(',')}}` : (val || '—');
                return <td key={sym} className="trans-cell">{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SIMULATION PANEL ─────────────────────────────────────────────────────────
function SimulationPanel({ minDFA, onHighlight }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const simulate = async () => {
    if (!minDFA) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dfa: minDFA, input }),
      });
      const data = await res.json();
      setResult(data);
      onHighlight(data.path || []);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="sim-panel">
      <h3 className="sim-title">String Simulator</h3>
      <p className="sim-desc">Test whether a string is accepted by the Minimized DFA</p>
      <div className="sim-input-row">
        <input
          className="sim-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && simulate()}
          placeholder="Enter string (e.g. abb)"
          disabled={!minDFA}
        />
        <button className="sim-btn" onClick={simulate} disabled={!minDFA || loading}>
          {loading ? '...' : 'Test'}
        </button>
        {result && (
          <button className="clear-btn" onClick={() => { setResult(null); onHighlight([]); }}>
            Clear
          </button>
        )}
      </div>

      {result && !result.error && (
        <div className={`sim-result ${result.accepted ? 'accepted' : 'rejected'}`}>
          <div className="result-verdict">
            {result.accepted ? '✓ ACCEPTED' : '✗ REJECTED'}
          </div>
          <div className="result-path">
            Path: {result.path?.join(' → ')}
          </div>
          <div className="result-steps">
            {result.steps?.map((s, i) => (
              <div key={i} className="step-row">
                <span className="step-from">{s.from}</span>
                {s.symbol !== '—' && (
                  <><span className="step-arrow">─{s.symbol}→</span>
                  <span className="step-to">{s.to}</span></>
                )}
                <span className="step-note">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result?.error && <div className="sim-error">{result.error}</div>}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [regex, setRegex] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('graphs');
  const [highlightPath, setHighlightPath] = useState([]);

  const examples = ['(a|b)*abb', 'a*b+', '(0|1)*00', 'ab*c', '(a|b|c)*'];

  const convert = async (r) => {
    const target = r || regex;
    if (!target.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    setHighlightPath([]);
    try {
      const res = await fetch(`${API}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regex: target }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch (e) {
      setError('Cannot connect to backend. Make sure it is running on port 3001.');
    }
    setLoading(false);
  };

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">∑</span>
            <div>
              <div className="logo-title">Automata Studio</div>
              <div className="logo-sub">Regular Expression → Finite Automata Converter</div>
            </div>
          </div>
          <div className="course-badge">CS224 · Formal Languages & Automata Theory</div>
        </div>
      </header>

      {/* ── INPUT SECTION ── */}
      <section className="input-section">
        <div className="input-card">
          <label className="input-label">Regular Expression</label>
          <div className="input-row">
            <input
              className="regex-input"
              value={regex}
              onChange={e => setRegex(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && convert()}
              placeholder="e.g.  (a|b)*abb"
              spellCheck={false}
            />
            <button
              className={`convert-btn ${loading ? 'loading' : ''}`}
              onClick={() => convert()}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Convert'}
            </button>
          </div>

          <div className="examples-row">
            <span className="examples-label">Examples:</span>
            {examples.map(ex => (
              <button key={ex} className="example-pill" onClick={() => { setRegex(ex); convert(ex); }}>
                {ex}
              </button>
            ))}
          </div>

          {error && <div className="error-banner">⚠ {error}</div>}
        </div>

        {/* Pipeline legend */}
        <div className="pipeline">
          <div className="pipe-step"><span className="pipe-icon nfa-c">NFA</span><span className="pipe-label">Thompson's Construction</span></div>
          <div className="pipe-arrow">→</div>
          <div className="pipe-step"><span className="pipe-icon dfa-c">DFA</span><span className="pipe-label">Subset Construction</span></div>
          <div className="pipe-arrow">→</div>
          <div className="pipe-step"><span className="pipe-icon min-c">Min</span><span className="pipe-label">Hopcroft's Algorithm</span></div>
        </div>
      </section>

      {/* ── TABS ── */}
      <div className="tabs-bar">
        {['graphs', 'tables', 'simulate'].map(t => (
          <button
            key={t}
            className={`tab-btn ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t === 'graphs' && '⬡ Automata Graphs'}
            {t === 'tables' && '⊞ Transition Tables'}
            {t === 'simulate' && '▷ String Simulator'}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <main className="main-content">
        {activeTab === 'graphs' && (
          <div className="graphs-grid">
            <AutomataPanel data={data?.nfa} type="nfa" title="Nondeterministic Finite Automaton" highlightPath={[]} />
            <AutomataPanel data={data?.dfa} type="dfa" title="Deterministic Finite Automaton" highlightPath={[]} />
            <AutomataPanel data={data?.minDFA} type="minDFA" title="Minimized DFA" highlightPath={highlightPath} />
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="tables-grid">
            <div className="table-card">
              <div className="table-card-header">
                <span className="panel-badge">NFA</span>
                <h3>NFA Transition Table</h3>
              </div>
              <TransitionTable data={data?.nfa} type="nfa" />
            </div>
            <div className="table-card">
              <div className="table-card-header">
                <span className="panel-badge dfa-badge">DFA</span>
                <h3>DFA Transition Table</h3>
              </div>
              <TransitionTable data={data?.dfa} type="dfa" />
            </div>
            <div className="table-card">
              <div className="table-card-header">
                <span className="panel-badge min-badge">Min</span>
                <h3>Min-DFA Transition Table</h3>
              </div>
              <TransitionTable data={data?.minDFA} type="minDFA" />
            </div>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div className="simulate-layout">
            <SimulationPanel minDFA={data?.minDFA} onHighlight={setHighlightPath} />
            <AutomataPanel
              data={data?.minDFA}
              type="minDFA"
              title="Minimized DFA (highlighted path)"
              highlightPath={highlightPath}
            />
          </div>
        )}
      </main>
    </div>
  );
}
