# Article AI Highlighter

A Chrome / Edge browser extension that lets you ask a question about any article and highlights the relevant passages **directly on the live page**.

---

## What it does

1. You open the side panel on any webpage.
2. Paste article text into the panel (or load a `.txt` file).
3. Type a question — e.g. *"What are the main conclusions?"*
4. The extension calls the [Anthropic API](https://www.anthropic.com/) (`claude-sonnet-4-20250514`) and asks it to find the exact verbatim passages that answer your question.
5. Those passages are highlighted in yellow on the live page and listed in the panel.

---

## How to install (unpacked / developer mode)

> **Chrome 114+ or Edge 114+** is required for Side Panel support.

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/Jijibean/article-ai-highlighter.git
   ```

2. Open Chrome and navigate to `chrome://extensions` (or `edge://extensions` for Edge).

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the `article-ai-highlighter` folder.

5. The extension icon (a yellow square) appears in your toolbar.  
   Pin it for easy access via the puzzle-piece menu.

---

## Getting an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/) and sign in (or create a free account).
2. Navigate to **API Keys** → **Create Key**.
3. Copy the key — it starts with `sk-ant-`.

> The key is stored **only** in your browser's local extension storage (`chrome.storage.local`) and is never sent anywhere except directly to `api.anthropic.com`.

---

## Usage

1. Navigate to any article or webpage.
2. Click the **Article AI Highlighter** icon in the toolbar.  
   The side panel opens on the right.
3. **Enter your API key** in the top field and click **Save** (only needed once).
4. **Add article text** — either:
   - Paste it into the *Article Text* textarea, or
   - Click **Load .txt file** to import a plain-text file.
5. **Type your question** in the *Your Question* field.
6. Click **Find & Highlight**.  
   The extension sends the text + question to Claude, receives the matching passages, lists them in the panel, and highlights them in yellow on the page.
7. Click **Clear Highlights** to remove all highlights.

---

## Tips

- The article text in the panel should match the page text as closely as possible for highlights to land correctly. If you copy directly from the page, results are most accurate.
- Longer, more specific questions tend to produce better passage selections.
- The model returns up to 6 passages. If none can be located on the page, the panel shows an explanatory message.
- You can re-submit with a different question without reloading the page.

---

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 extension manifest |
| `background.js` | Service worker — opens the side panel on icon click |
| `sidepanel.html` | Side panel markup |
| `sidepanel.css` | Side panel styles |
| `sidepanel.js` | Panel logic: API call, UI, messaging |
| `content.js` | Injected into pages — handles highlighting |
| `icons/` | Extension icons (16 / 48 / 128 px) |

---

## Privacy

- No data is collected or stored by this extension beyond your API key in local browser storage.
- Article text and questions are sent to Anthropic's API only when you click **Find & Highlight**.
- See [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) for how they handle API data.
