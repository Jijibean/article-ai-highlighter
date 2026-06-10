// background.js — service worker
// Opens the side panel when the extension action is clicked.

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);
