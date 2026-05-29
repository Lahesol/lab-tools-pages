const appGrid = document.querySelector("#appGrid");
const appTemplate = document.querySelector("#appTemplate");
const searchInput = document.querySelector("#searchInput");
const reloadButton = document.querySelector("#reloadButton");
const dfuProjectList = document.querySelector("#dfuProjectList");
const dfuProjectTemplate = document.querySelector("#dfuProjectTemplate");
const dfuProjectCount = document.querySelector("#dfuProjectCount");
const dfuGuide = document.querySelector(".dfu-guide");

let apps = [];
let dfuProjects = [];

function matchesSearch(app, query) {
  const text = `${app.name} ${app.description} ${app.group} ${app.status} ${app.url}`.toLowerCase();
  return text.includes(query.toLowerCase());
}

function absoluteUrl(path) {
  return new URL(path || "", window.location.href).href;
}

function cacheBustedAppUrl(path) {
  if (!path || path === "#") return "#";
  const url = new URL(path, window.location.href);
  url.searchParams.set("portal_v", Date.now().toString());
  return url.href;
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function shortHash(hash) {
  const value = String(hash || "");
  if (value.length <= 16) return value || "not provided";
  return `${value.slice(0, 16)}...${value.slice(-8)}`;
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
    const appUrl = cacheBustedAppUrl(app.url || "#");
    openLink.href = appUrl;

    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(appUrl === "#" ? absoluteUrl(app.url || "") : appUrl);
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

function renderDfuProjects() {
  dfuProjectList.textContent = "";
  dfuProjectCount.textContent = dfuProjects.length ? `${dfuProjects.length} project` : "Unavailable";

  if (dfuProjects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty dfu-empty";
    empty.textContent = "No DFU onboarding metadata is available.";
    dfuProjectList.appendChild(empty);
    return;
  }

  for (const item of dfuProjects) {
    const fragment = dfuProjectTemplate.content.cloneNode(true);
    const project = fragment.querySelector(".dfu-project");
    const board = fragment.querySelector(".dfu-board");
    const version = fragment.querySelector(".dfu-version");
    const setup = fragment.querySelector(".dfu-setup");
    const initial = fragment.querySelector(".dfu-initial");
    const web = fragment.querySelector(".dfu-web");
    const protocol = fragment.querySelector(".dfu-protocol");
    const hash = fragment.querySelector(".dfu-hash");
    const guideButton = fragment.querySelector(".guide-button");
    const hexLink = fragment.querySelector(".hex-link");
    const projectLink = fragment.querySelector(".project-link");
    const manifestLink = fragment.querySelector(".manifest-link");

    const initialFirmware = item.initialFirmware || {};
    const webDfu = item.webDfu || {};

    project.textContent = item.project || "Unnamed project";
    board.textContent = item.board || "Board target not specified";
    version.textContent = initialFirmware.version || webDfu.version || "Version unknown";
    setup.textContent = item.setupGuide || "";
    initial.textContent = `${initialFirmware.file || "initial image"} (${formatBytes(initialFirmware.size)})`;
    web.textContent = webDfu.version || "not specified";
    protocol.textContent = webDfu.protocol || "not specified";
    hash.textContent = shortHash(initialFirmware.sha256);
    hash.title = initialFirmware.sha256 || "";

    guideButton.addEventListener("click", () => {
      dfuGuide.classList.add("highlight");
      dfuGuide.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => dfuGuide.classList.remove("highlight"), 1400);
    });

    hexLink.href = initialFirmware.url || "#";
    projectLink.href = item.projectDfuUrl || "#";
    manifestLink.href = item.latestDfuManifestUrl || webDfu.packageUrl || "#";

    dfuProjectList.appendChild(fragment);
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

async function loadDfuProjects() {
  try {
    const response = await fetch(`./dfu-onboarding.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`dfu-onboarding.json ${response.status}`);
    }
    const data = await response.json();
    dfuProjects = Array.isArray(data) ? data : [data].filter(Boolean);
  } catch (error) {
    dfuProjects = [];
    console.warn("DFU onboarding metadata unavailable:", error);
  }
  renderDfuProjects();
}

async function reloadAll() {
  await Promise.all([loadApps(), loadDfuProjects()]);
}

searchInput.addEventListener("input", renderApps);
reloadButton.addEventListener("click", reloadAll);

reloadAll();
