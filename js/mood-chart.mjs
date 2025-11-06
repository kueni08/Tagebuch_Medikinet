import {
  loadEntries,
  getMoodScale,
  formatEntryLabel,
  isOutburst,
  buildHistorySummary,
  detectStorageSupport,
  getActiveConfig,
  readLocalEntries,
  writeLocalEntries,
  fetchEntriesFromJsonBin,
  pushEntriesToJsonBin,
  sortByDate,
  normalizeEntry,
} from "./data-access.mjs";

const chartSummary = document.getElementById("chart-summary");
const chartStatus = document.getElementById("chart-status");
const svg = document.getElementById("mood-chart");
const legendList = document.getElementById("mood-legend");
const historyStatus = document.getElementById("history-status");
const entriesBody = document.getElementById("entries-body");
const entriesList = document.getElementById("entries-list");
const historyMeta = document.getElementById("history-meta");
const exportBtn = document.getElementById("export-btn");
const tableWrapper = document.querySelector(".table-wrapper");
const mobileQuery = window.matchMedia("(max-width: 720px)");

const PADDING = { top: 40, right: 24, bottom: 56, left: 72 };
const VIEWBOX = { width: 800, height: 360 };

svg.setAttribute("viewBox", `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);

const storageAvailable = detectStorageSupport();
let { config: activeConfig } = getActiveConfig();
let storageMode = activeConfig ? "cloud" : storageAvailable ? "local" : "memory";
let lastSyncedAt = null;
let lastLocalSaveAt = null;
let historyEventsBound = false;

function clearChart() {
  while (svg.lastChild) {
    svg.removeChild(svg.lastChild);
  }
}

function renderLegend(labels) {
  if (!legendList) return;
  legendList.innerHTML = "";
  labels
    .slice()
    .sort((a, b) => labels.indexOf(a) - labels.indexOf(b))
    .forEach((label) => {
      const item = document.createElement("li");
      item.textContent = label;
      legendList.appendChild(item);
    });
}

function setHistoryStatus(message, tone = "info") {
  if (!historyStatus) return;
  historyStatus.textContent = message;
  historyStatus.setAttribute("data-tone", tone);
}

function refreshActiveConfig() {
  const result = getActiveConfig();
  activeConfig = result.config || null;
  storageMode = activeConfig ? "cloud" : storageAvailable ? "local" : "memory";
}

function readEntriesFromLocal() {
  const { entries, updatedAt } = readLocalEntries();
  lastLocalSaveAt = updatedAt;
  return entries;
}

function writeEntriesLocally(entries, updatedAt = new Date().toISOString()) {
  if (!storageAvailable) {
    return;
  }
  if (writeLocalEntries(entries, updatedAt)) {
    lastLocalSaveAt = updatedAt;
  }
}

function normalizeAndSortEntries(entries) {
  return sortByDate(entries.map(normalizeEntry));
}

function buildHistoryStatus(entries) {
  const reference = storageMode === "cloud" ? lastSyncedAt : lastLocalSaveAt;
  const summary = buildHistorySummary(entries, reference);
  if (storageMode === "cloud") {
    return entries.length
      ? `Online-Synchronisierung aktiv – ${summary}`
      : "Online-Synchronisierung aktiv. Noch keine Einträge.";
  }
  if (storageMode === "local") {
    return entries.length
      ? `Offline-Modus – ${summary}`
      : "Offline-Modus. Noch keine Einträge.";
  }
  return entries.length
    ? `Temporärer Modus – ${summary}`
    : "Temporärer Modus. Noch keine Einträge.";
}

function collectSideEffects(entry) {
  return [
    entry.kopfweh ? "Kopfweh" : null,
    entry.bauchweh ? "Bauchweh" : null,
    entry.schwindel ? "Schwindel" : null,
  ].filter(Boolean);
}

function formatSideEffectsText(entry) {
  const list = collectSideEffects(entry);
  return list.length ? list.join(", ") : "Keine";
}

function createSideEffectsTags(entry) {
  const list = collectSideEffects(entry);
  if (!list.length) {
    return '<span class="muted">Keine</span>';
  }
  return `<div class="tag-list">${list
    .map((label) => `<span class="tag">${label}</span>`)
    .join("")}</div>`;
}

function updateHistoryMeta(entries) {
  if (!historyMeta) return;
  const reference = storageMode === "cloud" ? lastSyncedAt : lastLocalSaveAt;
  historyMeta.textContent = buildHistorySummary(entries, reference);
}

function renderHistory(entries) {
  if (entriesBody) {
    entriesBody.innerHTML = "";
  }
  if (entriesList) {
    entriesList.innerHTML = "";
  }

  if (!entriesBody && !entriesList) {
    return;
  }

  if (!entries.length) {
    if (entriesBody) {
      entriesBody.innerHTML = `<tr class="empty-state"><td colspan="10">Noch keine Einträge gespeichert.</td></tr>`;
    }
    if (entriesList) {
      entriesList.innerHTML = `<p class="empty-state" role="status">Noch keine Einträge gespeichert.</p>`;
    }
    if (exportBtn) {
      exportBtn.disabled = true;
    }
    updateHistoryMeta(entries);
    syncHistoryView();
    return;
  }

  if (entriesBody) {
    for (const entry of entries) {
      const notesHtml = entry.auff ? entry.auff.replace(/\r?\n/g, "<br>") : "";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.datum}</td>
        <td>${entry.stimmung}</td>
        <td>${entry.konz}</td>
        <td>${entry.vorm}</td>
        <td>${entry.abend}</td>
        <td>${entry.appetit || ""}</td>
        <td>${entry.ausbr ? "✅ Ja" : "➖ Nein"}</td>
        <td>${formatSideEffectsText(entry)}</td>
        <td>${notesHtml}</td>
        <td><button type="button" class="table-action" data-entry-date="${entry.datum}" data-action="delete-entry">Löschen</button></td>
      `;
      entriesBody.appendChild(row);
    }
  }

  if (entriesList) {
    for (const entry of entries) {
      const card = document.createElement("article");
      card.className = "entry-card";
      card.setAttribute("role", "listitem");
      const notes = entry.auff ? entry.auff.replace(/\r?\n/g, "<br>") : "Keine Notizen";
      card.innerHTML = `
        <div class="entry-card__header">
          <span class="entry-card__date">${entry.datum}</span>
          <span class="entry-card__mood">${entry.stimmung}</span>
        </div>
        <dl>
          <div>
            <dt>Konzentration</dt>
            <dd>${entry.konz}</dd>
          </div>
          <div>
            <dt>Überreizung (Vormittag)</dt>
            <dd>${entry.vorm}</dd>
          </div>
          <div>
            <dt>Überreizung (Abend)</dt>
            <dd>${entry.abend}</dd>
          </div>
          <div>
            <dt>Appetit</dt>
            <dd>${entry.appetit || "Keine Angabe"}</dd>
          </div>
          <div>
            <dt>Ausbrüche</dt>
            <dd>${entry.ausbr ? "✅ Ja" : "➖ Nein"}</dd>
          </div>
          <div>
            <dt>Nebenwirkungen</dt>
            <dd>${createSideEffectsTags(entry)}</dd>
          </div>
          <div>
            <dt>Notizen</dt>
            <dd>${notes}</dd>
          </div>
        </dl>
        <button type="button" class="table-action" data-entry-date="${entry.datum}" data-action="delete-entry">Eintrag löschen</button>
      `;
      entriesList.appendChild(card);
    }
  }

  if (exportBtn) {
    exportBtn.disabled = false;
  }

  updateHistoryMeta(entries);
  syncHistoryView();
}

function syncHistoryView() {
  if (!entriesList) return;
  const hideTable = mobileQuery.matches;
  if (tableWrapper) {
    tableWrapper.setAttribute("aria-hidden", hideTable ? "true" : "false");
  }
  entriesList.setAttribute("aria-hidden", hideTable ? "false" : "true");
}

function exportCsv() {
  if (!cachedEntries.length) {
    window.alert("Es gibt keine Einträge zum Exportieren.");
    return;
  }

  const header = [
    "Datum",
    "Stimmung",
    "Konzentration",
    "Überreizung Vormittag",
    "Überreizung Abend",
    "Appetit",
    "Ausbrüche",
    "Kopfweh",
    "Bauchweh",
    "Schwindel",
    "Auffälligkeiten",
  ];

  const rows = cachedEntries.map((entry) => [
    entry.datum,
    entry.stimmung,
    entry.konz,
    entry.vorm,
    entry.abend,
    entry.appetit || "",
    entry.ausbr ? "Ja" : "Nein",
    entry.kopfweh ? "Ja" : "Nein",
    entry.bauchweh ? "Ja" : "Nein",
    entry.schwindel ? "Ja" : "Nein",
    (entry.auff || "").replace(/\r?\n/g, " "),
  ]);

  const csv = [header, ...rows]
    .map((cols) =>
      cols
        .map((value) => {
          const stringValue = value.toString();
          if (/[,";]/.test(stringValue)) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
          }
          return stringValue;
        })
        .join(";")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = "medikinet-tagebuch_" + new Date().toISOString().slice(0, 10) + ".csv";
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
}

function renderEmptyState(message) {
  clearChart();
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", VIEWBOX.width / 2);
  text.setAttribute("y", VIEWBOX.height / 2);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("fill", "#6b7280");
  text.setAttribute("font-size", "18");
  text.textContent = message;
  svg.appendChild(text);
}

function buildAxes() {
  const axis = document.createElementNS("http://www.w3.org/2000/svg", "g");
  axis.setAttribute("stroke", "#d1d5db");
  axis.setAttribute("stroke-width", "1");

  const xLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xLine.setAttribute("x1", PADDING.left);
  xLine.setAttribute("y1", VIEWBOX.height - PADDING.bottom);
  xLine.setAttribute("x2", VIEWBOX.width - PADDING.right);
  xLine.setAttribute("y2", VIEWBOX.height - PADDING.bottom);
  axis.appendChild(xLine);

  const yLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yLine.setAttribute("x1", PADDING.left);
  yLine.setAttribute("y1", PADDING.top);
  yLine.setAttribute("x2", PADDING.left);
  yLine.setAttribute("y2", VIEWBOX.height - PADDING.bottom);
  axis.appendChild(yLine);

  const { labels, scale: moodScale } = getMoodScale();
  const uniqueLabels = labels.slice().sort((a, b) => moodScale[a] - moodScale[b]);
  const step =
    (VIEWBOX.height - PADDING.top - PADDING.bottom) /
    (uniqueLabels.length > 1 ? uniqueLabels.length - 1 : 1);

  uniqueLabels.forEach((label, index) => {
    const y = VIEWBOX.height - PADDING.bottom - index * step;
    const grid = document.createElementNS("http://www.w3.org/2000/svg", "line");
    grid.setAttribute("x1", PADDING.left);
    grid.setAttribute("y1", y);
    grid.setAttribute("x2", VIEWBOX.width - PADDING.right);
    grid.setAttribute("y2", y);
    grid.setAttribute("stroke", "#e5e7eb");
    grid.setAttribute("stroke-dasharray", "4 6");
    axis.appendChild(grid);

    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("x", PADDING.left - 12);
    labelText.setAttribute("y", y + 6);
    labelText.setAttribute("text-anchor", "end");
    labelText.setAttribute("fill", "#4b5563");
    labelText.setAttribute("font-size", "14");
    labelText.textContent = label;
    axis.appendChild(labelText);
  });

  svg.appendChild(axis);
}

function renderMoodLine(entries) {
  const { scale } = getMoodScale();
  const filtered = entries.filter((entry) => scale[entry.stimmung]);
  if (!filtered.length) {
    renderEmptyState("Keine Stimmungsdaten vorhanden.");
    return;
  }
  filtered.sort((a, b) => a.datum.localeCompare(b.datum));
  const points = filtered.map((entry, index) => {
    const moodValue = scale[entry.stimmung];
    return {
      entry,
      x: PADDING.left +
        (filtered.length === 1
          ? (VIEWBOX.width - PADDING.left - PADDING.right) / 2
          : (index / (filtered.length - 1)) * (VIEWBOX.width - PADDING.left - PADDING.right)),
      y:
        PADDING.top +
        (1 - (moodValue - 1) / (Math.max(...Object.values(scale)) - 1)) *
          (VIEWBOX.height - PADDING.top - PADDING.bottom),
    };
  });

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#4f46e5");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);

  points.forEach((point) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 6);
    circle.setAttribute("fill", "#4f46e5");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "2");

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${point.entry.datum}: ${point.entry.stimmung}`;
    circle.appendChild(title);
    svg.appendChild(circle);

    if (isOutburst(point.entry)) {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "text");
      marker.setAttribute("x", point.x);
      marker.setAttribute("y", point.y - 18);
      marker.setAttribute("text-anchor", "middle");
      marker.setAttribute("font-size", "18");
      marker.setAttribute("fill", "#ef4444");
      marker.textContent = "⚡";
      const markerTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
      markerTitle.textContent = `${point.entry.datum}: Auffällige Ausbrüche`; 
      marker.appendChild(markerTitle);
      svg.appendChild(marker);
    }

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", point.x);
    label.setAttribute("y", VIEWBOX.height - PADDING.bottom + 24);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "12");
    label.setAttribute("fill", "#4b5563");
    label.textContent = formatEntryLabel(point.entry);
    svg.appendChild(label);
  });
}

let cachedEntries = [];
let cachedUpdatedAt = null;

function render() {
  if (!cachedEntries.length) {
    renderEmptyState("Noch keine Einträge vorhanden");
    chartSummary.textContent = buildHistorySummary(cachedEntries, cachedUpdatedAt);
    if (legendList) {
      legendList.innerHTML = "";
    }
    return;
  }
  clearChart();
  buildAxes();
  renderMoodLine(cachedEntries);
  chartSummary.textContent = buildHistorySummary(cachedEntries, cachedUpdatedAt);
  renderLegend(getMoodScale().labels);
}

async function getEntriesForWrite() {
  refreshActiveConfig();
  if (!activeConfig) {
    storageMode = storageAvailable ? "local" : "memory";
    return readEntriesFromLocal();
  }
  try {
    const { entries, updatedAt } = await fetchEntriesFromJsonBin(activeConfig);
    storageMode = "cloud";
    lastSyncedAt = updatedAt;
    writeEntriesLocally(entries, updatedAt);
    return entries;
  } catch (error) {
    console.warn("Fehler beim Abrufen", error);
    storageMode = storageAvailable ? "local" : "memory";
    const entries = readEntriesFromLocal();
    const tone = storageAvailable ? "warning" : "error";
    setHistoryStatus(
      storageAvailable
        ? `Online-Synchronisierung nicht erreichbar (${error.message}). Änderungen werden offline gespeichert.`
        : `Online-Synchronisierung nicht erreichbar (${error.message}). Änderungen können nur temporär gesichert werden.`,
      tone
    );
    return entries;
  }
}

async function persistEntries(entries) {
  const normalized = normalizeAndSortEntries(entries);
  if (!activeConfig) {
    storageMode = storageAvailable ? "local" : "memory";
    if (storageAvailable) {
      writeEntriesLocally(normalized, new Date().toISOString());
    }
    cachedEntries = normalized;
    cachedUpdatedAt = lastLocalSaveAt;
    renderHistory(normalized);
    render();
    const tone = storageAvailable ? "warning" : "error";
    setHistoryStatus(buildHistoryStatus(normalized), tone);
    return normalized;
  }
  try {
    const { entries: saved, updatedAt } = await pushEntriesToJsonBin(activeConfig, normalized);
    storageMode = "cloud";
    lastSyncedAt = updatedAt;
    writeEntriesLocally(saved, updatedAt);
    cachedEntries = saved;
    cachedUpdatedAt = updatedAt;
    renderHistory(saved);
    render();
    setHistoryStatus(buildHistoryStatus(saved), "success");
    return saved;
  } catch (error) {
    console.error("Fehler beim Speichern", error);
    storageMode = storageAvailable ? "local" : "memory";
    if (storageAvailable) {
      writeEntriesLocally(normalized, new Date().toISOString());
    }
    cachedEntries = normalized;
    cachedUpdatedAt = lastLocalSaveAt;
    renderHistory(normalized);
    render();
    const tone = storageAvailable ? "warning" : "error";
    setHistoryStatus(
      storageAvailable
        ? `Online-Synchronisierung fehlgeschlagen (${error.message}). Eintrag offline gesichert.`
        : `Online-Synchronisierung fehlgeschlagen (${error.message}). Eintrag nur temporär gesichert.`,
      tone
    );
    return normalized;
  }
}

async function deleteEntryByDate(entryDate) {
  if (!entryDate) return;
  const confirmDelete = window.confirm(`Eintrag vom ${entryDate} löschen?`);
  if (!confirmDelete) return;

  refreshActiveConfig();
  const deletingOnline = Boolean(activeConfig) && storageMode === "cloud";
  const tone = deletingOnline ? "info" : storageAvailable ? "warning" : "error";
  setHistoryStatus(
    deletingOnline
      ? `Lösche Eintrag vom ${entryDate}…`
      : `Entferne Eintrag vom ${entryDate}…`,
    tone
  );

  try {
    const latest = await getEntriesForWrite();
    const next = latest.filter((item) => item.datum !== entryDate);
    if (next.length === latest.length) {
      setHistoryStatus(`Kein Eintrag vom ${entryDate} gefunden.`, "error");
      return;
    }
    await persistEntries(next);
  } catch (error) {
    console.error(error);
    setHistoryStatus(`Eintrag konnte nicht gelöscht werden (${error.message}).`, "error");
  }
}

function handleEntryAction(event) {
  const button = event.target.closest('[data-action="delete-entry"]');
  if (!button) return;
  const { entryDate } = button.dataset;
  deleteEntryByDate(entryDate);
}

function bindHistoryEvents() {
  if (historyEventsBound) return;
  exportBtn?.addEventListener("click", exportCsv);
  entriesBody?.addEventListener("click", handleEntryAction);
  entriesList?.addEventListener("click", handleEntryAction);
  historyEventsBound = true;
}

async function refreshAll() {
  refreshActiveConfig();
  setHistoryStatus("Aktualisiere Verlauf…", "info");
  chartStatus.textContent = "Lade Stimmungsverlauf…";
  try {
    const { entries, updatedAt, source, cloudError } = await loadEntries(true);
    cachedEntries = entries;
    cachedUpdatedAt = updatedAt;
    if (source === "cloud") {
      storageMode = "cloud";
      lastSyncedAt = updatedAt;
      if (activeConfig) {
        writeEntriesLocally(entries, updatedAt);
      }
      chartStatus.textContent = "Daten aus der Cloud geladen";
    } else {
      storageMode = storageAvailable ? "local" : "memory";
      lastLocalSaveAt = updatedAt;
      chartStatus.textContent = storageAvailable
        ? "Lokale Daten geladen"
        : "Temporäre Daten geladen";
    }
    render();
    renderHistory(entries);

    const tone = source === "cloud" ? "success" : storageAvailable ? "warning" : "error";
    if (cloudError) {
      const fallback = storageAvailable
        ? `Online-Synchronisierung nicht erreichbar (${cloudError.message}). Offline-Daten aktiv.`
        : `Online-Synchronisierung nicht erreichbar (${cloudError.message}). Temporäre Daten aktiv.`;
      const summary = entries.length
        ? ` ${buildHistorySummary(entries, storageMode === "cloud" ? lastSyncedAt : lastLocalSaveAt)}`
        : "";
      setHistoryStatus(`${fallback}${summary}`.trim(), storageAvailable ? "warning" : "error");
    } else {
      setHistoryStatus(buildHistoryStatus(entries), tone);
    }
  } catch (error) {
    console.error(error);
    cachedEntries = [];
    cachedUpdatedAt = null;
    chartStatus.textContent = "Daten konnten nicht geladen werden.";
    renderEmptyState("Keine Daten verfügbar");
    if (legendList) {
      legendList.innerHTML = "";
    }
    renderHistory([]);
    setHistoryStatus("Verlauf konnte nicht geladen werden.", "error");
  }
}

async function init() {
  bindHistoryEvents();
  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", syncHistoryView);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(syncHistoryView);
  }
  await refreshAll();
}

window.addEventListener("resize", render);

init();
