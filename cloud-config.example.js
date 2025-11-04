// Kopiere diese Datei zu "cloud-config.js" und trage deine JSONBin-Zugangsdaten ein.
// Den Bin-Identifier findest du nach dem Anlegen einer Struktur (z. B. { "entries": [] })
// und den "X-Master-Key" erhältst du im JSONBin Dashboard unter "API Keys".
// Optional kannst du zusätzlich einen "X-Access-Key" eintragen, wenn du nur Lesezugriff erlauben willst.
window.MEDIKINET_CLOUD_CONFIG = {
  binId: "dein-jsonbin-bin-id", // z. B. 64f3a6e1baf6031234567890
  masterKey: "dein-jsonbin-master-key", // beginnt meist mit "$2b$" und sollte geheim bleiben
  accessKey: "", // optionaler Leseschlüssel, falls in JSONBin vergeben
};
