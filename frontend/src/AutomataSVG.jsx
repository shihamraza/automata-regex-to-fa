import React, { useState, useRef, useCallback, useEffect } from 'react';

export default function AutomataSVG({ automata, type, highlightPath = [], deadState = null }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const [positions, setPositions] = useState({});
  const [initialized, setInitialized] = useState(false);

  const radius = 28;

  // ── Initial circular layout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!automata?.states) return;
    const states = automata.states;
    const centerX = 300;
    const centerY = 195;
    const circleRadius = Math.min(140, 50 + states.length * 16);

    const initial = {};
    states.forEach((state, i) => {
      const angle = (2 * Math.PI * i) / states.length - Math.PI / 2;
      initial[state] = {
        x: centerX + circleRadius * Math.cos(angle),
        y: centerY + circleRadius * Math.sin(angle),
      };
    });
    setPositions(initial);
    setInitialized(true);
  }, [automata]);

  // ── SVG coordinate helper ────────────────────────────────────────────────────
  const getSVGPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // ── Mouse / touch events ─────────────────────────────────────────────────────
  const onMouseDownNode = useCallback((e, state) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getSVGPoint(e);
    dragging.current = {
      state,
      offsetX: x - positions[state].x,
      offsetY: y - positions[state].y,
    };
  }, [positions, getSVGPoint]);

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const { x, y } = getSVGPoint(e);
    const { state, offsetX, offsetY } = dragging.current;
    setPositions(prev => ({
      ...prev,
      [state]: { x: x - offsetX, y: y - offsetY },
    }));
  }, [getSVGPoint]);

  const onMouseUp = useCallback(() => { dragging.current = null; }, []);

  if (!automata?.states || !initialized) {
    return (
      <div style={{ color: '#475569', padding: '20px', fontStyle: 'italic', fontSize: 13, textAlign: 'center' }}>
        Enter a regex to generate
      </div>
    );
  }

  const states = automata.states;
  const accepts = new Set(type === 'nfa' ? [automata.accept] : automata.accepts || []);

  // ── Group transitions by from→to ─────────────────────────────────────────────
  const transitionMap = {};
  Object.entries(automata.transitions || {}).forEach(([from, trans]) => {
    Object.entries(trans).forEach(([symbol, to]) => {
      const destinations = Array.isArray(to) ? to : [to];
      destinations.forEach(dest => {
        const key = `${from}->${dest}`;
        if (!transitionMap[key]) transitionMap[key] = { from, to: dest, symbols: [] };
        if (!transitionMap[key].symbols.includes(symbol))
          transitionMap[key].symbols.push(symbol);
      });
    });
  });
  const edges = Object.values(transitionMap);
  const reverseSet = new Set(edges.map(e => `${e.to}->${e.from}`));

  return (
    <svg
      ref={svgRef}
      width="100%" height="400"
      viewBox="0 0 600 400"
      style={{ background: '#060d1a', userSelect: 'none', cursor: 'default' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onMouseMove}
      onTouchEnd={onMouseUp}
    >
      <defs>
        <marker id={`arr-${type}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#475569" />
        </marker>
        <marker id={`arr-hl-${type}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#f59e0b" />
        </marker>
        <marker id={`arr-eps-${type}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#a78bfa" />
        </marker>
        <marker id={`arr-start-${type}`} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#60a5fa" />
        </marker>
      </defs>

      {/* ── EDGES ── */}
      {edges.map((edge, i) => {
        const p1 = positions[edge.from];
        const p2 = positions[edge.to];
        if (!p1 || !p2) return null;

        const label = edge.symbols.slice().sort().join(', ');
        const isHL = highlightPath.includes(edge.from) && highlightPath.includes(edge.to);
        const hasEps = edge.symbols.includes('ε');
        const markerId = isHL ? `arr-hl-${type}` : hasEps ? `arr-eps-${type}` : `arr-${type}`;
        const strokeColor = isHL ? '#f59e0b' : hasEps ? '#a78bfa' : '#475569';
        const labelColor = isHL ? '#f59e0b' : hasEps ? '#c4b5fd' : '#94a3b8';

        // ── Self-loop ──
        if (edge.from === edge.to) {
          const cx = p1.x, cy = p1.y;
          const loopPath = `M ${cx - 12},${cy - radius + 4}
            C ${cx - 40},${cy - radius - 50}
              ${cx + 40},${cy - radius - 50}
              ${cx + 12},${cy - radius + 4}`;
          return (
            <g key={`e${i}`}>
              <path d={loopPath} fill="none" stroke={strokeColor} strokeWidth="2"
                markerEnd={`url(#${markerId})`} />
              <text x={cx} y={cy - radius - 34}
                fill={labelColor} fontSize="12" textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace" fontWeight="600">
                {label}
              </text>
            </g>
          );
        }

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy, dx);
        const isBidir = reverseSet.has(`${edge.from}->${edge.to}`);

        if (!isBidir) {
          // ── Straight edge ──
          const sx = p1.x + radius * Math.cos(angle);
          const sy = p1.y + radius * Math.sin(angle);
          const ex = p2.x - radius * Math.cos(angle);
          const ey = p2.y - radius * Math.sin(angle);
          const mx = (sx + ex) / 2;
          const my = (sy + ey) / 2;
          const nx = -dy / dist;
          const ny = dx / dist;
          const lx = mx + nx * 16;
          const ly = my + ny * 16;

          return (
            <g key={`e${i}`}>
              <line x1={sx} y1={sy} x2={ex} y2={ey}
                stroke={strokeColor} strokeWidth="2"
                markerEnd={`url(#${markerId})`} />
              <rect x={lx - label.length * 3.6 - 5} y={ly - 9}
                width={label.length * 7.2 + 10} height={17}
                rx={4} fill="#060d1a" fillOpacity={0.9} />
              <text x={lx} y={ly + 5} fill={labelColor} fontSize="12"
                textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
                {label}
              </text>
            </g>
          );
        } else {
          // ── Curved edge (bidirectional pair) ──
          const curve = 40;
          const nx = -dy / dist;
          const ny = dx / dist;
          const mx = (p1.x + p2.x) / 2 + nx * curve;
          const my = (p1.y + p2.y) / 2 + ny * curve;
          const a1 = Math.atan2(my - p1.y, mx - p1.x);
          const a2 = Math.atan2(my - p2.y, mx - p2.x);
          const sx = p1.x + radius * Math.cos(a1);
          const sy = p1.y + radius * Math.sin(a1);
          const ex = p2.x + radius * Math.cos(a2);
          const ey = p2.y + radius * Math.sin(a2);

          return (
            <g key={`e${i}`}>
              <path d={`M ${sx},${sy} Q ${mx},${my} ${ex},${ey}`}
                fill="none" stroke={strokeColor} strokeWidth="2"
                markerEnd={`url(#${markerId})`} />
              <rect x={mx - label.length * 3.6 - 5} y={my - 9}
                width={label.length * 7.2 + 10} height={17}
                rx={4} fill="#060d1a" fillOpacity={0.9} />
              <text x={mx} y={my + 5} fill={labelColor} fontSize="12"
                textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
                {label}
              </text>
            </g>
          );
        }
      })}

      {/* ── STATES ── */}
      {states.map(state => {
        const pos = positions[state];
        if (!pos) return null;

        const isStart = state === automata.start;
        const isAccept = accepts.has(state);
        const isHL = highlightPath.includes(state);
        const isDead = state === 'DEAD' || state === deadState;

        const strokeColor = isHL ? '#f59e0b'
          : isAccept ? '#34d399'
          : isStart ? '#60a5fa'
          : isDead ? '#7f1d1d'
          : '#334155';
        const fillColor = isHL ? 'rgba(245,158,11,0.14)'
          : isAccept ? 'rgba(52,211,153,0.09)'
          : isStart ? 'rgba(96,165,250,0.09)'
          : isDead ? 'rgba(127,29,29,0.25)'
          : '#0f172a';
        const textColor = isHL ? '#fbbf24'
          : isAccept ? '#34d399'
          : isStart ? '#93c5fd'
          : isDead ? '#f87171'
          : '#e2e8f0';

        return (
          <g key={state}
            onMouseDown={e => onMouseDownNode(e, state)}
            onTouchStart={e => onMouseDownNode(e, state)}
            style={{ cursor: 'grab' }}
          >
            {/* Glow */}
            {(isHL || isAccept || isStart) && (
              <circle cx={pos.x} cy={pos.y} r={radius + 9}
                fill={
                  isHL ? 'rgba(245,158,11,0.10)'
                  : isAccept ? 'rgba(52,211,153,0.08)'
                  : 'rgba(96,165,250,0.07)'
                }
              />
            )}

            {/* Initial state incoming arrow */}
            {isStart && (
              <line
                x1={pos.x - radius - 36} y1={pos.y}
                x2={pos.x - radius - 2} y2={pos.y}
                stroke="#60a5fa" strokeWidth="2.5"
                markerEnd={`url(#arr-start-${type})`}
              />
            )}

            {/* Main circle */}
            <circle cx={pos.x} cy={pos.y} r={radius}
              fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />

            {/* Double ring for accept state */}
            {isAccept && (
              <circle cx={pos.x} cy={pos.y} r={radius - 5}
                fill="none"
                stroke={isHL ? '#f59e0b' : '#34d399'}
                strokeWidth="1.5" />
            )}

            {/* Label */}
            <text x={pos.x} y={pos.y + 5}
              fill={textColor} fontSize="13" fontWeight="700"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              style={{ pointerEvents: 'none' }}>
              {state}
            </text>
          </g>
        );
      })}

      {/* Subtle drag hint */}
      <text x="300" y="395" textAnchor="middle"
        fill="#1a2a3a" fontSize="10" fontFamily="'DM Sans', sans-serif">
        drag states to rearrange
      </text>
    </svg>
  );
}