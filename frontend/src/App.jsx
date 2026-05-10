import React, { useState } from 'react';
import AutomataSVG from './AutomataSVG';
import './App.css';

const API = 'http://localhost:3001/api';

// ─── LEGEND ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="legend">
      <span className="legend-title">Key</span>

      <div className="legend-item">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <defs>
            <marker id="la" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0,7 3,0 6" fill="#60a5fa"/>
            </marker>
          </defs>
          <line x1="1" y1="18" x2="8" y2="18" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#la)"/>
          <circle cx="22" cy="18" r="13" fill="rgba(96,165,250,0.08)" stroke="#60a5fa" strokeWidth="2"/>
          <text x="22" y="23" textAnchor="middle" fill="#93c5fd" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">q0</text>
        </svg>
        <span>Initial state</span>
      </div>

      <div className="legend-item">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="13" fill="rgba(52,211,153,0.08)" stroke="#34d399" strokeWidth="2"/>
          <circle cx="18" cy="18" r="9" fill="none" stroke="#34d399" strokeWidth="1.5"/>
          <text x="18" y="23" textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">q1</text>
        </svg>
        <span>Accept state (double ring)</span>
      </div>

      <div className="legend-item">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="13" fill="rgba(15,23,42,0.95)" stroke="#475569" strokeWidth="2"/>
          <text x="18" y="23" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">q2</text>
        </svg>
        <span>Normal state</span>
      </div>

      <div className="legend-item">
        <svg width="52" height="20" viewBox="0 0 52 20">
          <defs>
            <marker id="lb" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0,7 3,0 6" fill="#a78bfa"/>
            </marker>
          </defs>
          <line x1="2" y1="10" x2="42" y2="10" stroke="#a78bfa" strokeWidth="1.8" markerEnd="url(#lb)"/>
          <text x="22" y="8" textAnchor="middle" fill="#a78bfa" fontSize="10" fontFamily="JetBrains Mono">ε</text>
        </svg>
        <span>ε-transition (NFA only)</span>
      </div>

      <div className="legend-item">
        <svg width="52" height="20" viewBox="0 0 52 20">
          <defs>
            <marker id="lc" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0,7 3,0 6" fill="#64748b"/>
            </marker>
          </defs>
          <line x1="2" y1="10" x2="42" y2="10" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#lc)"/>
          <text x="22" y="8" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">a</text>
        </svg>
        <span>Transition on symbol</span>
      </div>

      <div className="legend-item">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="13" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="2.5"/>
          <text x="18" y="23" textAnchor="middle" fill="#f59e0b" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">q0</text>
        </svg>
        <span>Highlighted (simulation)</span>
      </div>
    </div>
  );
}

// ─── AUTOMATA PANEL ───────────────────────────────────────────────────────────
function AutomataPanel({ data, type, title, highlightPath, deadState = null }) {
  const isNFA = type === 'nfa';
  const stateCount = data?.states?.length || 0;
  const acceptCount = isNFA ? (data?.accept ? 1 : 0) : (data?.accepts?.length || 0);
  const badgeClass = type === 'nfa' ? 'badge-nfa' : type === 'dfa' ? 'badge-dfa' : 'badge-min';
  const badgeLabel = type === 'nfa' ? 'NFA' : type === 'dfa' ? 'DFA' : 'MIN-DFA';

  return (
    <div className="automata-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <span className={`panel-badge ${badgeClass}`}>{badgeLabel}</span>
          <h3 className="panel-title">{title}</h3>
        </div>
        {data && (
          <div className="panel-stats">
            <span className="stat"><b>{stateCount}</b> states</span>
            <span className="stat-dot"/>
            <span className="stat"><b>{acceptCount}</b> accept</span>
            {data?.alphabet?.length > 0 && (
              <><span className="stat-dot"/><span className="stat">Σ = {'{' + data.alphabet.join(', ') + '}'}</span></>
            )}
          </div>
        )}
      </div>
      <div className="graph-container">
        <AutomataSVG automata={data} type={type} highlightPath={highlightPath} deadState={deadState} />
      </div>
    </div>
  );
}

// ─── TRANSITION TABLE ─────────────────────────────────────────────────────────
function TransitionTable({ data, type }) {
  if (!data) return <div className="table-empty">Enter a regex to generate</div>;
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
            <th className="th-state">State</th>
            {symbols.map(s => <th key={s} className={s === 'ε' ? 'th-eps' : ''}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {states.map(state => (
            <tr key={state} className={accepts.has(state) ? 'row-accept' : ''}>
              <td className="td-state">
                <span className="state-markers">
                  {state === start && <span className="marker-start">→</span>}
                  {accepts.has(state) && <span className="marker-accept">*</span>}
                </span>
                <span className="state-name">{state}</span>
              </td>
              {symbols.map(sym => {
                const val = data.transitions[state]?.[sym];
                const display = Array.isArray(val)
                  ? (val.length === 0 ? '∅' : '{' + val.join(',') + '}')
                  : (val || '—');
                return <td key={sym} className="td-trans">{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── STRING SIMULATOR ─────────────────────────────────────────────────────────
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

  const clear = () => { setResult(null); onHighlight([]); setInput(''); };

  return (
    <div className="sim-panel">
      <h3 className="sim-title">String Simulator</h3>
      <p className="sim-desc">Test whether a string is accepted by the Minimized DFA. The traversal path will be highlighted on the graph.</p>
      <div className="sim-input-row">
        <input
          className="sim-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && simulate()}
          placeholder={minDFA ? 'Type a string and press Enter…' : 'Convert a regex first'}
          disabled={!minDFA}
        />
        <button className="sim-btn" onClick={simulate} disabled={!minDFA || loading}>
          {loading ? '…' : 'Test'}
        </button>
        {result && <button className="clear-btn" onClick={clear}>Clear</button>}
      </div>

      {result && !result.error && (
        <div className={`sim-result ${result.accepted ? 'sim-accepted' : 'sim-rejected'}`}>
          <div className="sim-verdict">{result.accepted ? '✓  ACCEPTED' : '✗  REJECTED'}</div>
          <div className="sim-path">Path: {result.path?.join(' → ')}</div>
          <div className="sim-steps">
            <div className="steps-header">
              <span>#</span><span>From</span><span>On</span><span>To</span><span>Note</span>
            </div>
            {result.steps?.map((s, i) => (
              <div key={i} className="step-row">
                <span className="step-n">{i + 1}</span>
                <span className="step-state">{s.from}</span>
                <span className="step-sym">{s.symbol}</span>
                <span className="step-state">{s.to}</span>
                <span className="step-note">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result?.error && <div className="sim-error">⚠ {result.error}</div>}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [regex, setRegex] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('graphs');
  const [highlightPath, setHighlightPath] = useState([]);
  const [selectedAutomata, setSelectedAutomata] = useState('nfa');

  const examples = ['(a|b)*abb', 'a*b+', '(0|1)*00', 'ab*c', '(a|b|c)*'];

  const convert = async (r) => {
    const target = (r || regex).trim();
    if (!target) return;
    setLoading(true); setError(''); setData(null); setHighlightPath([]);
    try {
      const res = await fetch(`${API}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regex: target }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch {
      setError('Cannot connect to backend. Make sure it is running on port 3001.');
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-sigma">∑</span>
            <div>
              <div className="logo-name">Automata Studio</div>
              <div className="logo-sub">Regular Expression → Finite Automata Converter</div>
            </div>
          </div>
          <div className="course-tag">CS224 · Formal Languages &amp; Automata Theory</div>
        </div>
      </header>

      <section className="input-section">
        <div className="input-inner">
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
            <button className="convert-btn" onClick={() => convert()} disabled={loading}>
              {loading ? <span className="spinner"/> : 'Convert'}
            </button>
          </div>
          <div className="examples-row">
            <span className="ex-label">Try:</span>
            {examples.map(ex => (
              <button key={ex} className="ex-pill" onClick={() => { setRegex(ex); convert(ex); }}>{ex}</button>
            ))}
          </div>
          {error && <div className="error-bar">⚠ {error}</div>}
        </div>
        <div className="pipeline">
          <div className="pipe-step"><span className="pipe-badge badge-nfa">NFA</span><span className="pipe-algo">Thompson's Construction</span></div>
          <span className="pipe-arr">→</span>
          <div className="pipe-step"><span className="pipe-badge badge-dfa">DFA</span><span className="pipe-algo">Subset Construction</span></div>
          <span className="pipe-arr">→</span>
          <div className="pipe-step"><span className="pipe-badge badge-min">Min</span><span className="pipe-algo">Hopcroft's Algorithm</span></div>
        </div>
      </section>

      <nav className="tabs-bar">
        {[
          { id: 'graphs', label: '⬡  Automata Graphs' },
          { id: 'tables', label: '⊞  Transition Tables' },
          { id: 'simulate', label: '▷  String Simulator' },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      <main className="main-content">
        {activeTab === 'graphs' && (
          <>
            <div className="graph-controls">
              <Legend />
              <div className="dropdown-wrap">
                <label className="dropdown-label">Showing</label>
                <select
                  className="automata-select"
                  value={selectedAutomata}
                  onChange={e => setSelectedAutomata(e.target.value)}
                >
                  <option value="nfa">NFA — Nondeterministic Finite Automaton</option>
                  <option value="dfa">DFA — Deterministic Finite Automaton</option>
                  <option value="minDFA">Min-DFA — Minimized DFA</option>
                </select>
              </div>
            </div>
            <div className="single-graph">
              {selectedAutomata === 'nfa' && (
                <AutomataPanel data={data?.nfa} type="nfa" title="Nondeterministic Finite Automaton" highlightPath={[]} />
              )}
              {selectedAutomata === 'dfa' && (
                <AutomataPanel data={data?.dfa} type="dfa" title="Deterministic Finite Automaton" highlightPath={[]} deadState="DEAD" />
              )}
              {selectedAutomata === 'minDFA' && (
                <AutomataPanel data={data?.minDFA} type="minDFA" title="Minimized DFA" highlightPath={highlightPath} deadState={data?.minDFA?.deadState} />
              )}
            </div>
          </>
        )}

        {activeTab === 'tables' && (
          <div className="tables-grid">
            {[
              { key: 'nfa', label: 'NFA Transition Table', badge: 'badge-nfa', bLabel: 'NFA' },
              { key: 'dfa', label: 'DFA Transition Table', badge: 'badge-dfa', bLabel: 'DFA' },
              { key: 'minDFA', label: 'Min-DFA Transition Table', badge: 'badge-min', bLabel: 'MIN-DFA' },
            ].map(({ key, label, badge, bLabel }) => (
              <div key={key} className="table-card">
                <div className="table-card-hdr">
                  <span className={`panel-badge ${badge}`}>{bLabel}</span>
                  <h3>{label}</h3>
                </div>
                <TransitionTable data={data?.[key]} type={key} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'simulate' && (
          <div className="simulate-layout">
            <SimulationPanel minDFA={data?.minDFA} onHighlight={setHighlightPath} />
            <div className="sim-graph-wrap">
              <Legend />
              <AutomataPanel data={data?.minDFA} type="minDFA"
                title="Minimized DFA — active path highlighted" highlightPath={highlightPath} deadState={data?.minDFA?.deadState} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}