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
    fileInput.value = ''; // reset so same file can be re-loaded
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
  // This function is fleshed out fully in Step 3 & 4.
  // For now it just validates inputs.
  hideResults();

  const apiKey  = apiKeyInput.value.trim();
  const article = articleText.value.trim();
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

  // API call added in Step 3
  showError('API integration coming in Step 3.');
}

// ── UI helpers ────────────────────────────────────────────────────────────────
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
