// sidepanel.js

// ── DOM refs ──────────────────────────────────────────────────────────────────
const apiKeyInput        = document.getElementById('api-key');
const saveKeyBtn         = document.getElementById('save-key-btn');
const keyStatus          = document.getElementById('key-status');
const fileInput          = document.getElementById('file-input');
const articleText        = document.getElementById('article-text');
const charCount          = document.getElementById('char-count');
const clearTextBtn       = document.getElementById('clear-text-btn');
const questionInput      = document.getElementById('question');
const submitBtn          = document.getElementById('submit-btn');
const clearHighlightsBtn = document.getElementById('clear-highlights-btn');
const resultsSection     = document.getElementById('results-section');
const spinner            = document.getElementById('spinner');
const errorBox           = document.getElementById('error-box');
const passagesBox        = document.getElementById('passages-box');
const matchCount         = document.getElementById('match-count');
const passagesList       = document.getElementById('passages-list');

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

// ── Init ──────────────────────────────────────────────────────────────────────
chrome.storage.local.get('apiKey', ({ apiKey }) => {
  if (apiKey) {
    apiKeyInput.value = apiKey;
    setKeyStatus('Key loaded from storage.', 'success');
  }
});

// ── API Key ───────────────────────────────────────────────────────────────────
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setKeyStatus('Please enter a key.', 'error');
    return;
  }
  chrome.storage.local.set({ apiKey: key }, () => {
    setKeyStatus('Key saved.', 'success');
  });
});

function setKeyStatus(msg, type = '') {
  keyStatus.textContent = msg;
  keyStatus.className = 'hint' + (type ? ` ${type}` : '');
}

// ── File reader ───────────────────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    articleText.value = e.target.result;
    updateCharCount();
    fileInput.value = '';
  };
  reader.onerror = () => {
    alert('Failed to read the file. Make sure it is a plain .txt file.');
    fileInput.value = '';
  };
  reader.readAsText(file);
});

// ── Char counter ──────────────────────────────────────────────────────────────
articleText.addEventListener('input', updateCharCount);

function updateCharCount() {
  const len = articleText.value.length;
  charCount.textContent = `${len.toLocaleString()} character${len === 1 ? '' : 's'}`;
}

// ── Clear text ────────────────────────────────────────────────────────────────
clearTextBtn.addEventListener('click', () => {
  articleText.value = '';
  updateCharCount();
});

// ── Clear highlights ──────────────────────────────────────────────────────────
clearHighlightsBtn.addEventListener('click', sendClearHighlights);

async function sendClearHighlights() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_HIGHLIGHTS' }).catch(() => {});
}

// ── Submit ────────────────────────────────────────────────────────────────────
submitBtn.addEventListener('click', handleSubmit);

async function handleSubmit() {
  hideResults();

  const apiKey   = apiKeyInput.value.trim();
  const article  = articleText.value.trim();
  const question = questionInput.value.trim();

  if (!apiKey) {
    showError('Enter and save your Anthropic API key first.');
    return;
  }
  if (!article) {
    showError('Paste or load article text first.');
    return;
  }
  if (!question) {
    showError('Type a question before submitting.');
    return;
  }

  setLoading(true);
  showSpinner();

  let passages;
  try {
    passages = await fetchPassages(apiKey, article, question);
  } catch (err) {
    setLoading(false);
    showError(err.message);
    return;
  }

  setLoading(false);

  if (!passages || passages.length === 0) {
    showError('No matching passages found. Try rephrasing your question.');
    return;
  }

  renderPassages(passages);
  await highlightOnPage(passages);
}

// ── Anthropic API call ────────────────────────────────────────────────────────
async function fetchPassages(apiKey, article, question) {
  const systemPrompt = `You are a precise text-analysis assistant.
Your job: given an article and a question, find the verbatim passages in the article that best answer the question.

Rules:
- Return ONLY a valid JSON array of strings.
- Each string must be an EXACT, verbatim substring of the article — do not paraphrase or alter any word.
- Include 1–6 passages, ordered by relevance (most relevant first).
- If nothing in the article answers the question, return an empty array: []
- Output nothing except the JSON array. No markdown fences, no prose, no explanation.`;

  const userPrompt = `ARTICLE:
${article}

QUESTION:
${question}`;

  let response;
  try {
    response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (networkErr) {
    throw new Error('Network error — check your internet connection and try again.');
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.error?.message || detail;
    } catch (_) {}
    throw new Error(`API error: ${detail}`);
  }

  const data = await response.json();
  const raw = data?.content?.[0]?.text ?? '';

  // Strip markdown code fences in case the model adds them anyway
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (_) {
    throw new Error('Could not parse the model response as JSON. Try again.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected response format from model. Try again.');
  }

  return parsed.filter((p) => typeof p === 'string' && p.trim().length > 0);
}

// ── Render passages list ──────────────────────────────────────────────────────
function renderPassages(passages) {
  passagesList.innerHTML = '';
  passages.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    passagesList.appendChild(li);
  });
  matchCount.textContent = passages.length;
  show(passagesBox);
  show(resultsSection);
  hide(spinner);
  hide(errorBox);
}

// ── Send passages to content script ──────────────────────────────────────────
async function highlightOnPage(passages) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Ensure the content script is injected (handles pages opened before the
  // extension was installed or that match no declarative content_scripts rule).
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  } catch (_) {
    // Script already injected — that's fine.
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'HIGHLIGHT_PASSAGES',
      passages,
    });
    if (response && response.highlighted === 0) {
      showError(
        'Passages were found by the AI but could not be located in the ' +
        'page text. The article text in the panel may differ from the live page.'
      );
    }
  } catch (err) {
    showError(
      'Could not communicate with the page. ' +
      'Try refreshing the tab and submitting again.'
    );
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setLoading(on) {
  submitBtn.disabled = on;
  submitBtn.textContent = on ? 'Searching…' : 'Find & Highlight';
  clearHighlightsBtn.disabled = on;
}

function showError(msg) {
  errorBox.textContent = msg;
  show(errorBox);
  show(resultsSection);
  hide(spinner);
  hide(passagesBox);
}

function showSpinner() {
  hide(errorBox);
  hide(passagesBox);
  show(spinner);
  show(resultsSection);
}

function hideResults() {
  hide(resultsSection);
  hide(spinner);
  hide(errorBox);
  hide(passagesBox);
}

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }
