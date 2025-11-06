import { loadEntries, getMoodScale, formatEntryLabel, isOutburst, buildHistorySummary } from "./data-access.mjs";

const chartSummary = document.getElementById("chart-summary");
const chartStatus = document.getElementById("chart-status");
const svg = document.getElementById("mood-chart");
const legendList = document.getElementById("mood-legend");

const PADDING = { top: 40, right: 24, bottom: 56, left: 72 };
const VIEWBOX = { width: 800, height: 360 };

svg.setAttribute("viewBox", `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);

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

async function init() {
  chartStatus.textContent = "Lade Stimmungsverlauf…";
  try {
    const { entries, updatedAt, source } = await loadEntries(true);
    cachedEntries = entries;
    cachedUpdatedAt = updatedAt;
    chartStatus.textContent = source === "cloud" ? "Daten aus der Cloud geladen" : "Lokale Daten geladen";
    render();
  } catch (error) {
    console.error(error);
    cachedEntries = [];
    chartStatus.textContent = "Daten konnten nicht geladen werden.";
    renderEmptyState("Keine Daten verfügbar");
    if (legendList) {
      legendList.innerHTML = "";
    }
  }
}

window.addEventListener("resize", render);

init();
