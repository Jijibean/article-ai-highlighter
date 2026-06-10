// content.js — injected into every page

const MARK_CLASS = 'aih-highlight';

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'HIGHLIGHT_PASSAGES') {
    clearHighlights();
    const count = highlightPassages(msg.passages);
    sendResponse({ highlighted: count });
  } else if (msg.type === 'CLEAR_HIGHLIGHTS') {
    clearHighlights();
    sendResponse({ ok: true });
  }
  return false; // synchronous response
});

// ── Highlight logic ───────────────────────────────────────────────────────────

/**
 * Walk the live DOM and wrap every occurrence of each passage in a <mark>.
 * Returns the number of passages that had at least one match.
 */
function highlightPassages(passages) {
  if (!passages || passages.length === 0) return 0;

  let matchedCount = 0;
  let firstMark = null;

  for (const passage of passages) {
    if (typeof passage !== 'string' || passage.trim().length === 0) continue;
    const found = highlightOne(passage);
    if (found > 0) {
      matchedCount++;
      if (!firstMark) {
        firstMark = document.querySelector(`.${MARK_CLASS}`);
      }
    }
  }

  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return matchedCount;
}

/**
 * Find all text-node occurrences of `passage` in the document and wrap them.
 * Returns the number of wraps performed.
 */
function highlightOne(passage) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip invisible / irrelevant subtrees
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip already-highlighted nodes
        if (parent.classList && parent.classList.contains(MARK_CLASS)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  // Collect all text nodes up-front (modifying the DOM mid-walk is unsafe)
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  let wrapCount = 0;

  // Case-insensitive search: normalize both sides
  const needleLower = passage.toLowerCase();

  for (const textNode of textNodes) {
    const text = textNode.nodeValue;
    const textLower = text.toLowerCase();
    let idx = textLower.indexOf(needleLower);
    if (idx === -1) continue;

    // The passage spans this text node — split and wrap in-place
    const parent = textNode.parentNode;
    if (!parent) continue;

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    while (idx !== -1) {
      // Text before match
      if (idx > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, idx)));
      }

      // Matched text wrapped in <mark>
      const mark = document.createElement('mark');
      mark.className = MARK_CLASS;
      mark.style.cssText =
        'background:#FFE066;border-radius:2px;padding:0 1px;color:inherit;';
      mark.textContent = text.slice(idx, idx + passage.length);
      fragment.appendChild(mark);
      wrapCount++;

      cursor = idx + passage.length;
      idx = textLower.indexOf(needleLower, cursor);
    }

    // Remaining text after last match
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }

    parent.replaceChild(fragment, textNode);
  }

  return wrapCount;
}

// ── Clear logic ───────────────────────────────────────────────────────────────
function clearHighlights() {
  const marks = document.querySelectorAll(`.${MARK_CLASS}`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    // Replace <mark> with its text content
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    // Merge adjacent text nodes so future searches work cleanly
    parent.normalize();
  });
}
