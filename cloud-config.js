 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/cloud-config.example.js b/cloud-config.example.js
new file mode 100644
index 0000000000000000000000000000000000000000..a3b251c44c39cd5b51bfbcc3c7c927982db6a78b
--- /dev/null
+++ b/cloud-config.example.js
@@ -0,0 +1,12 @@
+// Optional: Kopiere diese Datei zu "cloud-config.js", wenn du eigene JSONBin-Zugangsdaten fest hinterlegen möchtest.
+// Alternativ kannst du sie direkt in index-cloud.html im Cloud-Abschnitt eintragen; die Angaben werden dort lokal gespeichert.
+// Die ausgelieferte Variante verbindet sich automatisch mit der mitgelieferten Bin-ID 690a4819d0ea881f40d3c2d8 –
+// passe die Werte hier nur an, wenn du einen anderen Speicher verwenden möchtest.
+// Den Bin-Identifier findest du nach dem Anlegen einer Struktur (z. B. { "entries": [] })
+// und den "X-Master-Key" erhältst du im JSONBin Dashboard unter "API Keys".
+// Optional kannst du zusätzlich einen "X-Access-Key" eintragen, wenn du nur Lesezugriff erlauben willst.
+window.MEDIKINET_CLOUD_CONFIG = {
+  binId: "690a4819d0ea881f40d3c2d8", // z. B. 64f3a6e1baf6031234567890
+  masterKey: "$2a$10$pAfG/4gttBIR1L3JJ7QW8.ZBWQg.QnhhkgvezlqJG2wiijtHg94h", // beginnt meist mit "$2b$" und sollte geheim bleiben
+  accessKey: "", // optionaler Leseschlüssel, falls in JSONBin vergeben
+};
 
EOF
)
