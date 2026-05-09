const express = require('express');
const cors = require('cors');
const { buildNFA } = require('./thompson');
const { buildDFA } = require('./subset');
const { minimizeDFA } = require('./minimize');
const { simulateString } = require('./simulator');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/convert', (req, res) => {
  try {
    const { regex } = req.body;
    if (!regex || typeof regex !== 'string') {
      return res.status(400).json({ error: 'regex field is required' });
    }

    const nfa = buildNFA(regex.trim());
    const dfa = buildDFA(nfa);
    const minDFA = minimizeDFA(dfa);

    res.json({ nfa, dfa, minDFA });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/simulate', (req, res) => {
  try {
    const { dfa, input } = req.body;
    if (!dfa || input === undefined) {
      return res.status(400).json({ error: 'dfa and input are required' });
    }
    const result = simulateString(dfa, input);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));