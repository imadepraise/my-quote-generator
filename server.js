const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'quotes.json');
const VALID_TAGS = ['wisdom', 'craft', 'humor', 'life'];

const SEED_QUOTES = [
  { id: 's1', text: "The unexamined life is not worth living.", author: "Socrates", tag: "wisdom", source: "seed" },
  { id: 's2', text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", tag: "wisdom", source: "seed" },
  { id: 's3', text: "It is not the strongest of the species that survives, but the one most responsive to change.", author: "Charles Darwin", tag: "wisdom", source: "seed" },
  { id: 's4', text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", tag: "craft", source: "seed" },
  { id: 's5', text: "Good code is its own best documentation.", author: "Steve McConnell", tag: "craft", source: "seed" },
  { id: 's6', text: "Premature optimization is the root of all evil.", author: "Donald Knuth", tag: "craft", source: "seed" },
  { id: 's7', text: "The best way to predict the future is to invent it.", author: "Alan Kay", tag: "craft", source: "seed" },
  { id: 's8', text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison", tag: "humor", source: "seed" },
  { id: 's9', text: "A computer once beat me at chess, but it was no match for me at kickboxing.", author: "Emo Philips", tag: "humor", source: "seed" },
  { id: 's10', text: "There are only two hard things in Computer Science: cache invalidation and naming things.", author: "Phil Karlton", tag: "humor", source: "seed" },
  { id: 's11', text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", tag: "life", source: "seed" },
  { id: 's12', text: "What we think, we become.", author: "Buddha", tag: "life", source: "seed" },
  { id: 's13', text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu", tag: "life", source: "seed" },
  { id: 's14', text: "Turn your wounds into wisdom.", author: "Oprah Winfrey", tag: "life", source: "seed" }
];

function readQuotes() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    return null;
  }
}

function writeQuotes(quotes) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(quotes, null, 2));
}

let quotes = readQuotes();
if (!quotes) {
  quotes = SEED_QUOTES;
  writeQuotes(quotes);
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Return every quote (seed + reader-submitted).
app.get('/api/quotes', (req, res) => {
  res.json(quotes);
});

// Add a reader-submitted quote. Persists to disk so it survives restarts
// and is visible to every visitor, not just the person who added it.
app.post('/api/quotes', (req, res) => {
  const { text, author, tag } = req.body || {};

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Quote text is required.' });
  }

  const newQuote = {
    id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim().slice(0, 280),
    author: (typeof author === 'string' && author.trim()) ? author.trim().slice(0, 60) : 'Anonymous',
    tag: VALID_TAGS.includes(tag) ? tag : 'life',
    source: 'user',
    createdAt: Date.now()
  };

  quotes = quotes.concat(newQuote);
  writeQuotes(quotes);
  res.status(201).json(newQuote);
});

const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
  console.log(`Quote generator running at http://localhost:${PORT}`);
});