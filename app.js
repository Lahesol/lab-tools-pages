const appGrid = document.querySelector("#appGrid");
const appTemplate = document.querySelector("#appTemplate");
const searchInput = document.querySelector("#searchInput");
const reloadButton = document.querySelector("#reloadButton");

let apps = [];

function matchesSearch(app, query) {
  const text = `${app.name} ${app.description} ${app.group} ${app.status} ${app.url}`.toLowerCase();
  return text.includes(query.toLowerCase());
}

function renderApps() {
  const query = searchInput.value.trim();
  appGrid.textContent = "";

  const filtered = apps.filter((app) => matchesSearch(app, query));

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No matching apps.";
    appGrid.appendChild(empty);
    return;
  }

  for (const app of filtered) {
    const fragment = appTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".app-card");
    const icon = fragment.querySelector(".app-icon");
    const name = fragment.querySelector(".app-name");
    const status = fragment.querySelector(".app-status");
    const description = fragment.querySelector(".app-description");
    const meta = fragment.querySelector(".app-meta");
    const openLink = fragment.querySelector(".open-link");
    const copyButton = fragment.querySelector(".copy-button");

    const accent = app.accent || "#0b7f78";
    card.style.setProperty("--accent", accent);
    icon.style.background = accent;
    name.textContent = app.name || "Untitled";
    status.textContent = app.status || "Ready";
    description.textContent = app.description || "";
    meta.textContent = `${app.group || "General"} | ${app.url || ""}`;
    openLink.href = app.url || "#";

    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(app.url || "");
      copyButton.textContent = "Copied";
      copyButton.classList.add("copied");
      setTimeout(() => {
        copyButton.textContent = "Copy URL";
        copyButton.classList.remove("copied");
      }, 1200);
    });

    appGrid.appendChild(fragment);
  }
}

async function loadApps() {
  try {
    const response = await fetch(`./apps.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`apps.json ${response.status}`);
    }
    apps = await response.json();
    renderApps();
  } catch (error) {
    appGrid.textContent = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = `Failed to load apps: ${error.message}`;
    appGrid.appendChild(empty);
  }
}

searchInput.addEventListener("input", renderApps);
reloadButton.addEventListener("click", loadApps);

loadApps();
