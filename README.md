# Automata Studio — CS224 Final Project
### Regular Expression to Finite Automata Converter

---

## What This Project Does

Takes a regular expression as input and performs the full conversion pipeline:

1. **NFA** via Thompson's Construction
2. **DFA** via Subset Construction  
3. **Minimized DFA** via Hopcroft's Algorithm
4. **String Testing** against the minimized DFA

---

## Prerequisites

- **Node.js** v16 or higher
- **npm**

---

## Setup & Running (Do This Once)

### 1. Install backend dependencies
```bash
cd backend
npm install
```

### 2. Install frontend dependencies
```bash
cd ../frontend
npm install
```

---

## Running the Project (Every Time)

You need TWO terminal windows open simultaneously.

### Terminal 1 — Start the Backend
```bash
cd backend
npm start
# Should print: Backend running on http://localhost:3001
```

### Terminal 2 — Start the Frontend
```bash
cd frontend
npm start
# Opens http://localhost:3000 in your browser automatically
```

---

## How to Use

1. Type a regular expression in the input box (e.g. `(a|b)*abb`)
2. Press **Convert** or hit Enter
3. Three automata are generated:
   - **NFA** — Thompson's construction result (may have ε-transitions)
   - **DFA** — Subset construction result (deterministic, no ε)
   - **Min-DFA** — Hopcroft minimization (fewest possible states)
4. Switch to **Transition Tables** to see the δ function tabularly
5. Switch to **String Simulator** to test strings against the Min-DFA

---

## Supported Regex Syntax

| Syntax | Meaning |
|--------|---------|
| `a`, `b`, `0`, `1` | Literals |
| `P\|Q` | Union (P or Q) |
| `PQ` | Concatenation (implicit) |
| `P*` | Kleene star (zero or more) |
| `P+` | Plus (one or more) |
| `P?` | Optional (zero or one) |
| `(P)` | Grouping |

**Example expressions:**
- `(a|b)*abb` — strings ending in abb over {a,b}
- `a*b+` — zero or more a's followed by one or more b's
- `(0|1)*00` — binary strings ending in 00

---

## Project Structure

```
regex-automata/
├── backend/
│   ├── src/
│   │   ├── thompson.js    # Regex → NFA (Thompson's construction)
│   │   ├── subset.js      # NFA → DFA (Subset/Powerset construction)
│   │   ├── minimize.js    # DFA → Min-DFA (Hopcroft's algorithm)
│   │   ├── simulator.js   # String acceptance testing
│   │   └── index.js       # Express API server
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx         # Main React component + all UI panels
    │   ├── App.css         # Professional styling
    │   └── index.js        # React entry point
    └── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/convert` | Convert regex → NFA, DFA, Min-DFA |
| POST | `/api/simulate` | Test string against a DFA |
| GET  | `/api/health` | Check if backend is running |

---

## Grading Modules Checklist

- [x] Thompson's construction (NFA)
- [x] Subset construction (DFA)
- [x] DFA minimization (Hopcroft)
- [x] String acceptance testing
- [x] Visual graph representation (interactive, draggable)
- [x] Transition tables
- [x] Step-by-step simulation trace
- [x] Path highlighting on graphs
