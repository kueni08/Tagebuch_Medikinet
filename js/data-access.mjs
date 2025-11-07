export const API_BASE = "https://api.jsonbin.io/v3/b";
export const STORAGE_KEYS = {
  config: "medikinetJsonBinConfig",
  entries: "medikinetDiaryEntries",
};

const MOOD_SCALE = {
  "😣 Herausfordernd": 1,
  "☹️ Schwankend": 2,
  "😐 Neutral": 3,
  "🙂 Gut": 4,
  "😊 Sehr gut": 5,
};

const MOOD_LABELS = Object.keys(MOOD_SCALE);

export function detectStorageSupport() {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return false;
  }
  try {
    const testKey = "__medikinet_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn("Lokaler Speicher nicht verfügbar", error);
    return false;
  }
}

export function normalizeConfig(value) {
  if (!value) return null;
  const { binId, masterKey, accessKey } = value;
  if (!binId || typeof binId !== "string") {
    return null;
  }
  return {
    binId: binId.trim(),
    masterKey: masterKey?.trim() || "",
    accessKey: accessKey?.trim() || "",
  };
}

export function readStoredConfig() {
  if (!detectStorageSupport()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.config);
    if (!raw) return null;
    return normalizeConfig(JSON.parse(raw));
  } catch (error) {
    console.warn("Gespeicherte Cloud-Konfiguration konnte nicht gelesen werden", error);
    return null;
  }
}

export function writeStoredConfig(value) {
  if (!detectStorageSupport()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Cloud-Konfiguration konnte nicht gespeichert werden", error);
    return false;
  }
}

export function clearStoredConfig() {
  if (!detectStorageSupport()) return false;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.config);
    return true;
  } catch (error) {
    console.warn("Cloud-Konfiguration konnte nicht entfernt werden", error);
    return false;
  }
}

export function getActiveConfig() {
  const inlineConfig =
    typeof window !== "undefined" && "MEDIKINET_CLOUD_CONFIG" in window
      ? normalizeConfig(window.MEDIKINET_CLOUD_CONFIG)
      : null;
  if (inlineConfig) {
    return { config: inlineConfig, origin: "inline" };
  }
  const stored = readStoredConfig();
  if (stored) {
    return { config: stored, origin: "browser" };
  }
  return { config: null, origin: null };
}

export function normalizeEntry(entry) {
  return {
    datum: entry?.datum ?? "",
    dosierung: entry?.dosierung ?? "",
    stimmung: entry?.stimmung ?? "",
    konz:
      entry?.konz ??
      entry?.konz_morgen ??
      entry?.konz_nachmittag ??
      "",
    konz_morgen: entry?.konz_morgen ?? entry?.konz ?? "",
    konz_nachmittag: entry?.konz_nachmittag ?? entry?.konz ?? "",
    vorm: entry?.vorm ?? "",
    abend: entry?.abend ?? "",
    hausaufgaben: entry?.hausaufgaben ?? "",
    appetit: entry?.appetit ?? "",
    ausbr: Boolean(entry?.ausbr),
    kopfweh: Boolean(entry?.kopfweh),
    bauchweh: Boolean(entry?.bauchweh),
    schwindel: Boolean(entry?.schwindel),
    auff: entry?.auff ? entry.auff.toString() : "",
  };
}

export function sortByDate(entries) {
  return entries
    .slice()
    .filter((entry) => entry.datum)
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

export function readLocalEntries() {
  const supportsStorage = detectStorageSupport();
  let updatedAt = null;
  if (!supportsStorage) {
    return { entries: [], updatedAt };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.entries);
    if (!raw) {
      return { entries: [], updatedAt };
    }
    const payload = JSON.parse(raw);
    if (Array.isArray(payload)) {
      return { entries: sortByDate(payload.map(normalizeEntry)), updatedAt };
    }
    if (payload && Array.isArray(payload.entries)) {
      updatedAt = payload.updatedAt || null;
      return { entries: sortByDate(payload.entries.map(normalizeEntry)), updatedAt };
    }
  } catch (error) {
    console.warn("Lokale Einträge konnten nicht gelesen werden", error);
  }
  return { entries: [], updatedAt };
}

export function writeLocalEntries(entries, updatedAt = new Date().toISOString()) {
  const supportsStorage = detectStorageSupport();
  if (!supportsStorage) {
    return false;
  }
  try {
    const payload = {
      entries: entries.map(normalizeEntry),
      updatedAt,
    };
    window.localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn("Lokale Sicherung konnte nicht gespeichert werden", error);
    return false;
  }
}

export async function fetchEntriesFromJsonBin(config) {
  const url = `${API_BASE}/${config.binId}/latest`;
  const headers = {};
  if (config.masterKey) {
    headers["X-Master-Key"] = config.masterKey;
  }
  if (config.accessKey) {
    headers["X-Access-Key"] = config.accessKey;
  }
  const response = await fetch(url, { headers });
  if (response.status === 404) {
    throw new Error("Bin nicht gefunden (404)");
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  const payload = await response.json();
  const updatedAt =
    payload.metadata?.updatedAt ||
    payload.metadata?.modifiedAt ||
    payload.metadata?.createdAt ||
    new Date().toISOString();
  const entries = Array.isArray(payload.record?.entries)
    ? payload.record.entries.map(normalizeEntry)
    : [];
  return { entries: sortByDate(entries), updatedAt };
}

export async function pushEntriesToJsonBin(config, entries) {
  const url = `${API_BASE}/${config.binId}`;
  const headers = {};
  if (config.masterKey) {
    headers["X-Master-Key"] = config.masterKey;
  }
  if (config.accessKey) {
    headers["X-Access-Key"] = config.accessKey;
  }
  headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "X-Bin-Versioning": "false" },
    body: JSON.stringify({
      entries: entries.map(normalizeEntry),
      updatedAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  const payload = await response.json();
  const updatedAt =
    payload.metadata?.updatedAt ||
    payload.metadata?.modifiedAt ||
    payload.metadata?.createdAt ||
    new Date().toISOString();
  const savedEntries = Array.isArray(payload.record?.entries)
    ? payload.record.entries.map(normalizeEntry)
    : entries;
  return { entries: sortByDate(savedEntries), updatedAt };
}

export async function loadEntries(preferCloud = true) {
  const { config } = getActiveConfig();
  let cloudError = null;
  if (preferCloud && config) {
    try {
      const result = await fetchEntriesFromJsonBin(config);
      return { ...result, source: "cloud", cloudError: null };
    } catch (error) {
      console.warn("Cloud konnte nicht geladen werden", error);
      cloudError = error;
    }
  }
  const localResult = readLocalEntries();
  if (localResult.entries.length) {
    return { ...localResult, source: "local", cloudError };
  }
  return { entries: [], updatedAt: null, source: config ? "cloud" : "local", cloudError };
}

export function buildHistorySummary(entries, updatedAt) {
  if (!entries.length) {
    return "Noch keine Einträge";
  }
  const first = entries[0]?.datum;
  const last = entries[entries.length - 1]?.datum;
  const range = first && last ? (first === last ? first : `${first} bis ${last}`) : "";
  const updatedText = updatedAt
    ? new Date(updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
    : null;
  const base = range ? `${entries.length} Einträge (${range})` : `${entries.length} Einträge`;
  return updatedText ? `${base} · Stand ${updatedText}` : base;
}

export function getMoodScale() {
  return { scale: MOOD_SCALE, labels: MOOD_LABELS.slice().sort((a, b) => MOOD_SCALE[a] - MOOD_SCALE[b]) };
}

export function toDate(entry) {
  if (!entry?.datum) return null;
  const [year, month, day] = entry.datum.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function isOutburst(entry) {
  return Boolean(entry?.ausbr);
}

export function formatEntryLabel(entry) {
  const date = toDate(entry);
  if (!date) return entry?.datum || "";
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function parseEntries(entries) {
  return entries.map(normalizeEntry);
}

export const STORAGE = {
  keys: STORAGE_KEYS,
};
