/* Appearance only. No measurement state, BLE commands, or data transformations. */
(() => {
  "use strict";
  const storageKey = "ad5940-console-theme-v1";
  const root = document.documentElement;
  const valid = (theme) => theme === "light" || theme === "dark";
  let initial = "light";
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (valid(saved)) initial = saved;
  } catch { /* Private/restricted storage must not block the instrument UI. */ }
  try {
    const requested = new URLSearchParams(window.location.search).get("theme");
    if (valid(requested)) initial = requested;
  } catch { /* Keep the saved/default theme if URL access is unavailable. */ }

  function syncControls() {
    const dark = root.dataset.theme === "dark";
    const button = document.getElementById("themeToggle");
    if (button) {
      button.textContent = dark ? "밝은 테마" : "어두운 테마";
      button.setAttribute("aria-label", dark ? "밝은 테마 사용" : "어두운 테마 사용");
      button.setAttribute("aria-pressed", String(dark));
      button.title = dark ? "현재 어두운 테마 · 밝게 전환" : "현재 밝은 테마 · 어둡게 전환";
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#071525" : "#ffffff");
  }

  function apply(theme, persist) {
    if (!valid(theme)) return;
    root.dataset.theme = theme;
    if (persist) {
      try { window.localStorage.setItem(storageKey, theme); } catch { /* Optional preference only. */ }
    }
    syncControls();
    window.dispatchEvent(new CustomEvent("ad5940:themechange", { detail: { theme } }));
  }

  // Runs in <head> before the stylesheets/first paint to avoid a dark flash.
  apply(initial, false);
  document.addEventListener("DOMContentLoaded", () => {
    syncControls();
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      apply(root.dataset.theme === "dark" ? "light" : "dark", true);
    });
  }, { once: true });
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) apply(valid(event.newValue) ? event.newValue : "light", false);
  });
})();
