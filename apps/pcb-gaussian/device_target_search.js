(() => {
  const $ = id => document.getElementById(id);
  const DEFAULT_SEED = "paper_data\\paper_measurements\\curve_match_live\\run_20260602_171833\\update_log.csv";

  function api() {
    return window.PCBGaussian || {};
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function csvFromRows(rows) {
    return api().csvFromRows ? api().csvFromRows(rows) : rows.map(row => row.map(csvEscape).join(",")).join("\n");
  }

  function download(name, content, type) {
    if (api().download) {
      api().download(name, content, type);
      return;
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function status(text, kind = "") {
    const node = $("deviceTargetSearchStatus");
    if (!node) return;
    node.textContent = text;
    node.className = `hint ${kind}`.trim();
  }

  function numberValue(id, fallback) {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function currentSeedRows() {
    if (api().getDeviceSeedRows) return api().getDeviceSeedRows();
    const rows = [["device", "to_mu_code", "to_vstart_code", "next_program_command"]];
    for (let device = 1; device <= 16; device += 1) rows.push([device, 0, 60, `P${device},0,60`]);
    return rows;
  }

  function seedCsvName() {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "_");
    return `pcb_gaussian_target_seed_${stamp}.csv`;
  }

  function setOutput(text) {
    const output = $("deviceTargetCommandOutput");
    if (output) output.value = text;
  }

  function shellQuote(text) {
    const value = String(text || "");
    return value.includes(" ") ? `"${value.replaceAll('"', '\\"')}"` : value;
  }

  function readOptions() {
    return {
      seedPath: $("deviceTargetSeedPath")?.value.trim() || DEFAULT_SEED,
      shifts: $("deviceTargetShifts")?.value.trim() || "0,0;4,0;-4,0;0,4;0,-4",
      fitFrom: $("deviceTargetFitFrom")?.value || "base",
      fitStages: Math.max(0, Math.round(numberValue("deviceTargetFitStages", 1))),
      threshold: numberValue("deviceTargetThreshold", 0.95),
      metric: $("deviceTargetMetric")?.value || "mean_similarity",
      startMv: Math.round(numberValue("deviceTargetStartMv", -14800)),
      stopMv: Math.round(numberValue("deviceTargetStopMv", 14800)),
      stepMv: Math.max(1, Math.round(numberValue("deviceTargetStepMv", 300))),
      avg: Math.max(1, Math.round(numberValue("deviceTargetAvg", 256))),
      settleUs: Math.max(0, Math.round(numberValue("deviceTargetSettleUs", 30000))),
      preBiasMs: Math.max(0, Math.round(numberValue("deviceTargetPreBiasMs", 2000))),
      reverse: $("deviceTargetReverse")?.checked !== false,
      acceptOnly: $("deviceTargetAcceptOnly")?.checked === true,
    };
  }

  function buildCommand() {
    const opt = readOptions();
    const parts = [
      ".\\.venv_gui\\Scripts\\python.exe -u .\\tools\\search_curve_match_target.py",
      "--devices all",
      `--seed-code-csv ${shellQuote(opt.seedPath)}`,
      `--candidate-shifts "${opt.shifts.replaceAll('"', '\\"')}"`,
      `--fit-from ${opt.fitFrom}`,
      `--fit-stages ${opt.fitStages}`,
      `--similarity-threshold ${opt.threshold}`,
      `--threshold-metric ${opt.metric}`,
      `--start-mv ${opt.startMv} --stop-mv ${opt.stopMv}`,
      `--step-mv ${opt.stepMv}`,
      `--avg ${opt.avg}`,
      `--settle-us ${opt.settleUs}`,
      `--pre-bias-ms ${opt.preBiasMs}`,
      "--program-settle-ms 500 --timeout-sec 150",
    ];
    if (opt.reverse) parts.push("--reverse");
    if (opt.acceptOnly) parts.push("--accept-improving-only");
    return parts.join(" `\n  ");
  }

  function loadCurrentSeed() {
    const name = seedCsvName();
    const rows = currentSeedRows();
    const csv = "\ufeff" + csvFromRows(rows);
    setOutput(csv);
    const seed = $("deviceTargetSeedPath");
    if (seed) seed.value = name;
    status(`Loaded current GUI seed (${rows.length - 1} devices). Download it and place it at the seed CSV path before running the command.`, "ok");
  }

  function downloadCurrentSeed() {
    const name = $("deviceTargetSeedPath")?.value.trim() || seedCsvName();
    download(name.split(/[\\/]/).pop() || seedCsvName(), "\ufeff" + csvFromRows(currentSeedRows()), "text/csv;charset=utf-8");
    status("Downloaded current target-search seed CSV.", "ok");
  }

  function generateCommand() {
    const command = buildCommand();
    setOutput(command);
    status("Generated reproducible target-search command.", "ok");
  }

  function recipeMarkdown() {
    const command = buildCommand();
    return [
      "# PCB Gaussian Target Search Recipe",
      "",
      "Purpose: try one common target curve, and if similarity stays below the threshold, shift the target Vmu/Vstart code and repeat.",
      "",
      "Algorithm:",
      "1. Save the current per-device Vmu/Vstart codes as a seed CSV.",
      "2. For each candidate shift `(dVmu_code,dVstart_code)`, generate a target seed.",
      "3. Measure all devices at the shifted seed and use the batch median Gaussian as a fixed target.",
      "4. Fit all devices toward that fixed target with the Jacobian/LM updater.",
      "5. Stop if the selected similarity metric reaches the threshold; otherwise keep the best candidate.",
      "",
      "Command:",
      "```powershell",
      command,
      "```",
      "",
    ].join("\n");
  }

  function downloadRecipe() {
    download(`pcb_gaussian_target_search_recipe_${Date.now()}.md`, recipeMarkdown(), "text/markdown;charset=utf-8");
    status("Downloaded target-search recipe.", "ok");
  }

  function runBrowserSearch() {
    const runner = api().runDeviceTargetSearchBrowser;
    if (!runner) {
      status("Browser target search is not available in this GUI build.", "warn");
      return;
    }
    runner();
  }

  function downloadBrowserSummary() {
    const rows = api().getDeviceTargetSearchRows ? api().getDeviceTargetSearchRows() : [];
    if (!rows.length) {
      status("No browser target-search rows to download.", "warn");
      return;
    }
    download(`pcb_gaussian_browser_target_search_${Date.now()}.csv`, "\ufeff" + csvFromRows(rows), "text/csv;charset=utf-8");
    status(`Downloaded ${rows.length - 1} browser target-search row(s).`, "ok");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else if (ch === '"') {
          quoted = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch !== "\r") {
        field += ch;
      }
    }
    row.push(field);
    if (row.some(Boolean)) rows.push(row);
    const header = rows.shift() || [];
    return rows.map(values => Object.fromEntries(header.map((key, index) => [key.replace(/^\ufeff/, ""), values[index] ?? ""])));
  }

  async function readSummaryFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    const scored = rows
      .map(row => ({ row, score: Number(row.mean_similarity) }))
      .filter(item => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score);
    const best = scored[0]?.row;
    const host = $("deviceTargetBestSummary");
    if (!best || !host) {
      status("No valid target-search summary row found.", "warn");
      return;
    }
    host.innerHTML = [
      `<strong>Best candidate ${best.candidate ?? "-"}</strong>`,
      `shift Vmu ${best.mu_offset ?? "-"} / Vstart ${best.vstart_offset ?? "-"}`,
      `target A ${Number(best.target_A_uA).toPrecision(5)} uA, mu ${Number(best.target_mu_V).toFixed(3)} V, sigma ${Number(best.target_sigma_V).toFixed(3)} V`,
      `mean similarity ${(100 * Number(best.mean_similarity)).toFixed(2)}%, min similarity ${(100 * Number(best.min_similarity)).toFixed(2)}%`,
      `fit run: ${best.fit_run_dir || "-"}`,
    ].join("<br>");
    status(`Loaded summary: best mean similarity ${(100 * Number(best.mean_similarity)).toFixed(2)}%.`, Number(best.mean_similarity) >= 0.95 ? "ok" : "warn");
  }

  function bind() {
    $("deviceTargetLoadSeedButton")?.addEventListener("click", loadCurrentSeed);
    $("deviceTargetDownloadSeedButton")?.addEventListener("click", downloadCurrentSeed);
    $("deviceTargetCommandButton")?.addEventListener("click", generateCommand);
    $("deviceTargetRunBrowserButton")?.addEventListener("click", runBrowserSearch);
    $("deviceTargetDownloadSummaryButton")?.addEventListener("click", downloadBrowserSummary);
    $("deviceTargetRecipeButton")?.addEventListener("click", downloadRecipe);
    $("deviceTargetSummaryFile")?.addEventListener("change", readSummaryFile);
  }

  window.addEventListener("DOMContentLoaded", bind);
})();
