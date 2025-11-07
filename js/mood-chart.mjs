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

const MOOD_SCALE_DATA = getMoodScale();
const MOOD_SERIES_SCALE = MOOD_SCALE_DATA.scale;

const CONCENTRATION_SCALE = {
  "😣 Kaum möglich": 1,
  "☹️ Schwierig": 2,
  "😐 Mittel": 3,
  "🙂 Gut fokussiert": 4,
  "😊 Sehr fokussiert": 5,
};

const OVERSTIMULATION_SCALE = {
  "😣 Stark überreizt": 1,
  "☹️ Deutlich angespannt": 2,
  "😐 Leicht angespannt": 3,
  "🙂 Gut reguliert": 4,
  "😊 Sehr ruhig": 5,
};

const APPETITE_SCALE = {
  "🐭 Kaum Hunger": 1,
  "🐰 Wenig Hunger": 2,
  "🐱 Normaler Hunger": 3,
  "🦊 Großer Hunger": 4,
  "🐻 Bärenhunger": 5,
};

const HOMEWORK_SCALE = {
  "😌 Keine": 1,
  "🙂 Wenige": 2,
  "😐 Normal": 3,
  "☹️ Viele": 4,
  "😣 Sehr viele": 5,
};

const SERIES_CONFIG = [
  {
    id: "stimmung",
    label: "Stimmung",
    color: "#4f46e5",
    accessor: (entry) => entry.stimmung,
    scale: MOOD_SERIES_SCALE,
    summary: "😣 → 😊",
  },
  {
    id: "konz_morgen",
    label: "Konzentration (Morgen)",
    color: "#0ea5e9",
    accessor: (entry) => [entry.konz_morgen, entry.konz],
    scale: CONCENTRATION_SCALE,
    summary: "😣 → 😊",
  },
  {
    id: "konz_nachmittag",
    label: "Konzentration (Nachmittag)",
    color: "#0284c7",
    accessor: (entry) => [entry.konz_nachmittag, entry.konz],
    scale: CONCENTRATION_SCALE,
    summary: "😣 → 😊",
  },
  {
    id: "vorm",
    label: "Überreizung (Vormittag)",
    color: "#f97316",
    accessor: (entry) => entry.vorm,
    scale: OVERSTIMULATION_SCALE,
    summary: "😣 → 😊",
  },
  {
    id: "abend",
    label: "Überreizung (Abend)",
    color: "#ea580c",
    accessor: (entry) => entry.abend,
    scale: OVERSTIMULATION_SCALE,
    summary: "😣 → 😊",
  },
  {
    id: "appetit",
    label: "Appetit",
    color: "#16a34a",
    accessor: (entry) => entry.appetit,
    scale: APPETITE_SCALE,
    summary: "🐭 → 🐻",
  },
  {
    id: "hausaufgaben",
    label: "Hausaufgabenmenge",
    color: "#a855f7",
    accessor: (entry) => entry.hausaufgaben,
    scale: HOMEWORK_SCALE,
    summary: "😌 → 😣",
  },
];

const LEVELS = [1, 2, 3, 4, 5];
const LEVEL_LABELS = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
};

const DOSAGE_COLORS = {
  5: "#e6f8ec",
  10: "#cdf2d6",
  15: "#fff4c2",
  20: "#fde3a7",
  25: "#fbc27a",
};

const SIDE_EFFECT_MARKERS = [
  { key: "kopfweh", icon: "🤕", label: "Kopfweh" },
  { key: "bauchweh", icon: "🤢", label: "Bauchweh" },
  { key: "schwindel", icon: "💫", label: "Schwindel" },
];

const OUTBURST_MARKER = { icon: "⚡", label: "Auffällige Ausbrüche" };

const CHART_MIN_LEVEL = LEVELS[0];
const CHART_MAX_LEVEL = LEVELS[LEVELS.length - 1];

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

function renderLegend(series) {
  if (!legendList) return;
  legendList.innerHTML = "";
  series.forEach((item) => {
    const li = document.createElement("li");
    li.className = "legend-item";

    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = item.color;
    li.appendChild(swatch);

    const label = document.createElement("span");
    label.className = "legend-label";
    label.textContent = item.label;
    li.appendChild(label);

    if (item.summary) {
      const summary = document.createElement("span");
      summary.className = "legend-scale";
      summary.textContent = item.summary;
      li.appendChild(summary);
    }

    legendList.appendChild(li);
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
      entriesBody.innerHTML = `<tr class="empty-state"><td colspan="13">Noch keine Einträge gespeichert.</td></tr>`;
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
        <td>${entry.dosierung || "–"}</td>
        <td>${entry.stimmung}</td>
        <td>${entry.konz_morgen || entry.konz || ""}</td>
        <td>${entry.konz_nachmittag || entry.konz || ""}</td>
        <td>${entry.vorm}</td>
        <td>${entry.abend}</td>
        <td>${entry.hausaufgaben || ""}</td>
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
            <dt>Dosierung</dt>
            <dd>${entry.dosierung || "Keine Angabe"}</dd>
          </div>
          <div>
            <dt>Konzentration (Morgen)</dt>
            <dd>${entry.konz_morgen || entry.konz || "Keine Angabe"}</dd>
          </div>
          <div>
            <dt>Konzentration (Nachmittag)</dt>
            <dd>${entry.konz_nachmittag || entry.konz || "Keine Angabe"}</dd>
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
            <dt>Hausaufgaben</dt>
            <dd>${entry.hausaufgaben || "Keine Angabe"}</dd>
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
    "Dosierung",
    "Stimmung",
    "Konzentration Morgen",
    "Konzentration Nachmittag",
    "Überreizung Vormittag",
    "Überreizung Abend",
    "Hausaufgaben",
    "Appetit",
    "Ausbrüche",
    "Kopfweh",
    "Bauchweh",
    "Schwindel",
    "Auffälligkeiten",
  ];

  const rows = cachedEntries.map((entry) => [
    entry.datum,
    entry.dosierung || "",
    entry.stimmung,
    entry.konz_morgen || entry.konz || "",
    entry.konz_nachmittag || entry.konz || "",
    entry.vorm,
    entry.abend,
    entry.hausaufgaben || "",
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

  const chartHeight = VIEWBOX.height - PADDING.top - PADDING.bottom;
  const denominator = CHART_MAX_LEVEL - CHART_MIN_LEVEL || 1;

  LEVELS.forEach((level) => {
    const ratio = (level - CHART_MIN_LEVEL) / denominator;
    const y = VIEWBOX.height - PADDING.bottom - ratio * chartHeight;

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
    labelText.textContent = LEVEL_LABELS[level] ?? String(level);
    axis.appendChild(labelText);
  });

  svg.appendChild(axis);
}

function parseDosageValue(text) {
  if (typeof text !== "string") {
    return null;
  }
  const match = text.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
}

function getDosageColorForValue(value) {
  if (value == null) {
    return null;
  }
  if (value in DOSAGE_COLORS) {
    return DOSAGE_COLORS[value];
  }
  const sortedKeys = Object.keys(DOSAGE_COLORS)
    .map((key) => Number.parseInt(key, 10))
    .filter((key) => !Number.isNaN(key))
    .sort((a, b) => a - b);
  if (!sortedKeys.length) {
    return null;
  }
  for (const key of sortedKeys) {
    if (value <= key) {
      return DOSAGE_COLORS[key];
    }
  }
  return DOSAGE_COLORS[sortedKeys[sortedKeys.length - 1]];
}

function renderDosageBackground(timeline) {
  if (!timeline.length) {
    return;
  }
  const chartHeight = VIEWBOX.height - PADDING.top - PADDING.bottom;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  timeline.forEach((point, index) => {
    const dosageValue = parseDosageValue(point.entry.dosierung);
    if (!dosageValue) {
      return;
    }
    const color = getDosageColorForValue(dosageValue);
    if (!color) {
      return;
    }
    const previousX = index === 0 ? PADDING.left : (timeline[index - 1].x + point.x) / 2;
    const nextX =
      index === timeline.length - 1
        ? VIEWBOX.width - PADDING.right
        : (point.x + timeline[index + 1].x) / 2;
    const width = Math.max(0, nextX - previousX);
    if (!width) {
      return;
    }
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", previousX.toFixed(2));
    rect.setAttribute("y", PADDING.top);
    rect.setAttribute("width", width.toFixed(2));
    rect.setAttribute("height", chartHeight);
    rect.setAttribute("fill", color);
    rect.setAttribute("fill-opacity", "0.35");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${point.entry.datum}: Dosierung ${point.entry.dosierung || "unbekannt"}`;
    rect.appendChild(title);
    group.appendChild(rect);
  });
  if (group.childNodes.length) {
    svg.appendChild(group);
  }
}

function buildTimeline(entries) {
  const filtered = entries
    .filter((entry) => entry.datum)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  if (!filtered.length) {
    return [];
  }
  const range = VIEWBOX.width - PADDING.left - PADDING.right;
  return filtered.map((entry, index) => {
    const x =
      PADDING.left +
      (filtered.length === 1 ? range / 2 : (index / (filtered.length - 1)) * range);
    return { entry, x };
  });
}

function resolveSeriesValue(series, entry) {
  const raw = typeof series.accessor === "function" ? series.accessor(entry) : entry[series.id];
  const candidates = Array.isArray(raw) ? raw : [raw];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    const value = series.scale?.[candidate];
    if (typeof value === "number") {
      return { label: candidate, level: value };
    }
  }
  return null;
}

function getSeriesPoints(series, timeline) {
  const chartHeight = VIEWBOX.height - PADDING.top - PADDING.bottom;
  const denominator = CHART_MAX_LEVEL - CHART_MIN_LEVEL || 1;
  return timeline.reduce((points, point) => {
    const resolved = resolveSeriesValue(series, point.entry);
    if (!resolved) {
      return points;
    }
    const ratio = (resolved.level - CHART_MIN_LEVEL) / denominator;
    const y = PADDING.top + (1 - ratio) * chartHeight;
    points.push({ ...point, y, label: resolved.label, level: resolved.level });
    return points;
  }, []);
}

function drawSeries(series, points) {
  if (!points.length) {
    return;
  }
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", series.color);
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);

  points.forEach((point) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 5.5);
    circle.setAttribute("fill", series.color);
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "2");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${point.entry.datum}: ${series.label} – ${point.label}`;
    circle.appendChild(title);
    svg.appendChild(circle);
  });
}

function renderXAxisLabels(timeline) {
  timeline.forEach((point) => {
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

function getEntryMarkers(entry) {
  const markers = [];
  if (isOutburst(entry)) {
    markers.push({ ...OUTBURST_MARKER });
  }
  SIDE_EFFECT_MARKERS.forEach((marker) => {
    if (entry?.[marker.key]) {
      markers.push({ icon: marker.icon, label: marker.label });
    }
  });
  return markers;
}

function renderEntryMarkers(timeline, pointsBySeries) {
  const baseline = new Map();
  Object.values(pointsBySeries).forEach((seriesPoints) => {
    seriesPoints.forEach((point) => {
      const current = baseline.get(point.entry);
      const next = typeof current === "number" ? Math.min(current, point.y) : point.y;
      baseline.set(point.entry, next);
    });
  });

  timeline.forEach((point) => {
    const markers = getEntryMarkers(point.entry);
    if (!markers.length) {
      return;
    }
    const minY = baseline.get(point.entry) ?? VIEWBOX.height - PADDING.bottom;
    const baseY = Math.max(PADDING.top + 18, minY - 18);
    markers.forEach((marker, index) => {
      const offset = (index - (markers.length - 1) / 2) * 16;
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "text");
      icon.setAttribute("x", point.x + offset);
      icon.setAttribute("y", baseY);
      icon.setAttribute("text-anchor", "middle");
      icon.setAttribute("font-size", "16");
      icon.textContent = marker.icon;
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${point.entry.datum}: ${marker.label}`;
      icon.appendChild(title);
      svg.appendChild(icon);
    });
  });
}

function renderChartSeries(entries) {
  const timeline = buildTimeline(entries);
  if (!timeline.length) {
    return false;
  }
  const pointsBySeries = {};
  let hasSeries = false;
  SERIES_CONFIG.forEach((series) => {
    const points = getSeriesPoints(series, timeline);
    if (points.length) {
      hasSeries = true;
      pointsBySeries[series.id] = points;
    }
  });
  if (!hasSeries) {
    return false;
  }
  renderDosageBackground(timeline);
  buildAxes();
  SERIES_CONFIG.forEach((series) => {
    const points = pointsBySeries[series.id];
    if (!points?.length) {
      return;
    }
    drawSeries(series, points);
  });
  renderXAxisLabels(timeline);
  renderEntryMarkers(timeline, pointsBySeries);
  return true;
}

let cachedEntries = [];
let cachedUpdatedAt = null;

function render() {
  clearChart();
  if (!cachedEntries.length) {
    renderEmptyState("Noch keine Einträge vorhanden");
    chartSummary.textContent = buildHistorySummary(cachedEntries, cachedUpdatedAt);
    renderLegend(SERIES_CONFIG);
    return;
  }
  const hasChart = renderChartSeries(cachedEntries);
  if (!hasChart) {
    renderEmptyState("Keine auswertbaren Daten für das Diagramm.");
  }
  chartSummary.textContent = buildHistorySummary(cachedEntries, cachedUpdatedAt);
  renderLegend(SERIES_CONFIG);
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
