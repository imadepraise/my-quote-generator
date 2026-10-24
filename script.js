const TAGS = ["all", "wisdom", "craft", "humor", "life"];

const quoteText = document.getElementById('quoteText');
const quoteAuthor = document.getElementById('quoteAuthor');
const fetchBtn = document.getElementById('fetchBtn');
const fetchLabel = document.getElementById('fetchLabel');
const copyBtn = document.getElementById('copyBtn');
const statusLine = document.getElementById('statusLine');
const sourceNote = document.getElementById('sourceNote');
const tagRow = document.getElementById('tagRow');
const countLabel = document.getElementById('countLabel');
const quoteInput = document.getElementById('quoteInput');
const authorInput = document.getElementById('authorInput');
const tagSelect = document.getElementById('tagSelect');
const charCount = document.getElementById('charCount');
const submitBtn = document.getElementById('submitBtn');
const submitLabel = document.getElementById('submitLabel');
const submitStatus = document.getElementById('submitStatus');
const dbNote = document.getElementById('dbNote');

let activeTag = "all";
let lastIndex = -1;
let currentQuote = null;
let quotes = [];       // full pool, loaded from the server
let quotesLoaded = false;

function pool() {
  return activeTag === "all" ? quotes : quotes.filter(q => q.tag === activeTag);
}

function renderTags() {
  tagRow.innerHTML = "";
  TAGS.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag' + (tag === activeTag ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      activeTag = tag;
      renderTags();
      updateCount();
    });
    tagRow.appendChild(btn);
  });
}

function updateCount() {
  const n = pool().length;
  const userN = quotes.filter(q => q.source === 'user').length;
  countLabel.textContent = n + (n === 1 ? ' quote' : ' quotes') + ' in "' + activeTag + '"' +
    (userN ? ' \u00b7 ' + userN + ' reader-submitted' : '');
}

function populateTagSelect() {
  tagSelect.innerHTML = '';
  TAGS.filter(t => t !== 'all').forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    tagSelect.appendChild(opt);
  });
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Loads the full quote pool from the server.
async function loadQuotes() {
  const res = await fetch('/api/quotes');
  if (!res.ok) throw new Error('Could not load quotes from the server.');
  quotes = await res.json();
  quotesLoaded = true;
}

// A real network round trip to refresh the pool, held open to a minimum
// 4s so the loading state (spinner, disabled button) is clearly visible.
async function fetchQuote() {
  const [res] = await Promise.all([fetch('/api/quotes'), sleep(4000)]);
  if (!res.ok) throw new Error('Request failed. Try again.');
  quotes = await res.json();

  const candidates = pool();
  if (candidates.length === 0) {
    throw new Error('No quotes match that filter.');
  }
  let idx = Math.floor(Math.random() * candidates.length);
  if (candidates.length > 1) {
    while (idx === lastIndex) idx = Math.floor(Math.random() * candidates.length);
  }
  lastIndex = idx;
  return candidates[idx];
}

function setLoading(isLoading) {
  fetchBtn.disabled = isLoading;
  fetchBtn.classList.toggle('loading', isLoading);
  fetchLabel.textContent = isLoading ? 'Fetching\u2026' : 'New quote';
}

function swapText(el, newText) {
  el.classList.remove('fade-in');
  el.classList.add('fade-out');
  return new Promise(res => {
    setTimeout(() => {
      el.textContent = newText;
      el.style.opacity = '';
      el.classList.remove('fade-out');
      el.classList.add('fade-in');
      res();
    }, 180);
  });
}

async function getNewQuote() {
  setLoading(true);
  statusLine.textContent = '';
  statusLine.classList.remove('err');
  const started = performance.now();
  try {
    const quote = await fetchQuote();
    const elapsed = Math.round(performance.now() - started);
    currentQuote = quote;
    await swapText(quoteText, quote.text);
    await swapText(quoteAuthor, quote.author);
    updateCount();
    statusLine.textContent = 'Fetched in ' + elapsed + 'ms';
    if (quote.source === 'user') {
      sourceNote.textContent = 'Submitted by a reader';
      sourceNote.style.display = 'block';
    } else {
      sourceNote.style.display = 'none';
    }
  } catch (err) {
    statusLine.textContent = err.message;
    statusLine.classList.add('err');
  } finally {
    setLoading(false);
  }
}

fetchBtn.addEventListener('click', getNewQuote);

copyBtn.addEventListener('click', async () => {
  if (!currentQuote) return;
  const line = '"' + currentQuote.text + '" \u2014 ' + currentQuote.author;
  try {
    await navigator.clipboard.writeText(line);
    const original = copyBtn.textContent;
    copyBtn.textContent = 'Copied';
    setTimeout(() => { copyBtn.textContent = original; }, 1200);
  } catch (e) {
    copyBtn.textContent = 'Select & copy manually';
  }
});

function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle('loading', isLoading);
  submitLabel.textContent = isLoading ? 'Adding\u2026' : 'Add quote';
}

quoteInput.addEventListener('input', () => {
  charCount.textContent = quoteInput.value.length + ' / 280';
});

async function submitQuote() {
  const text = quoteInput.value.trim();
  const author = authorInput.value.trim();
  const tag = tagSelect.value;

  submitStatus.classList.remove('ok', 'err');
  if (!text) {
    submitStatus.textContent = 'Write a quote first.';
    submitStatus.classList.add('err');
    return;
  }

  setSubmitLoading(true);
  submitStatus.textContent = '';
  try {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author, tag })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Could not save that quote.');
    }
    const created = await res.json();
    quotes = quotes.concat(created);
    updateCount();
    quoteInput.value = '';
    authorInput.value = '';
    charCount.textContent = '0 / 280';
    submitStatus.textContent = 'Added \u2014 now in the shared pool.';
    submitStatus.classList.add('ok');
  } catch (err) {
    submitStatus.textContent = err.message || 'Could not save that quote.';
    submitStatus.classList.add('err');
  } finally {
    setSubmitLoading(false);
  }
}

submitBtn.addEventListener('click', submitQuote);

async function init() {
  renderTags();
  populateTagSelect();
  try {
    await loadQuotes();
    updateCount();
  } catch (err) {
    dbNote.style.display = 'block';
    dbNote.textContent = err.message + ' Make sure the server is running (npm start).';
  }
}

init();