# Medikinet-Tagebuch

Das Tagebuch besteht nur aus einer einzelnen Datei (`index.html`). Öffne sie lokal im Browser oder lade
sie auf einen statischen Webhost (z. B. GitHub Pages, Netlify, Vercel) – es sind keine zusätzlichen
Build-Schritte oder Abhängigkeiten nötig.

Die Anwendung synchronisiert Einträge bevorzugt mit [JSONBin](https://jsonbin.io) und legt gleichzeitig
eine lokale Sicherung im Browser an. Fällt der Cloud-Dienst aus oder sind keine Zugangsdaten hinterlegt,
läuft das Tagebuch automatisch komplett offline weiter.

## Funktionsumfang

- Responsives Layout mit klaren Karten, mobiler Kartenansicht und CSV-Export.
- Formular für Stimmung, Konzentration, Überreizung (Vor- und Nachmittag), besondere Beobachtungen
  (Ausbrüche, Kopfweh, Bauchweh, Schwindel) sowie freie Notizen.
- Pro Datum gibt es genau einen Eintrag, der beim erneuten Speichern überschrieben wird.
- Einzelne Tage lassen sich direkt aus dem Verlauf löschen – eine globale „Alles löschen“-Funktion gibt es
  bewusst nicht.
- Automatische Sicherung im Browser-Speicher als Fallback, inklusive CSV-Export.

## JSONBin einrichten

1. Erstelle bei [jsonbin.io](https://jsonbin.io) einen Bin mit dem Inhalt `{ "entries": [] }` und notiere dir
   die erzeugte Bin-ID.
2. Im JSONBin-Dashboard findest du unter **API Keys** den `X-Master-Key`. Optional kannst du zusätzlich einen
   `X-Access-Key` mit Leserechten verwenden.
3. Trage die Zugangsdaten direkt im Abschnitt **Cloud-Speicher** der Anwendung ein. Die Werte werden nur lokal
   im Browser gespeichert und lassen sich dort wieder löschen.
4. Alternativ kannst du sie in `cloud-config.js` hinterlegen. Diese Datei ist bereits im Repository enthalten
   und exportiert standardmäßig `null`. Ersetze die Werte durch deine Zugangsdaten, wenn du das Tagebuch auf
   einem Hoster bereitstellst und die Konfiguration fest einchecken möchtest.

> ⚠️ Der Master-Key erlaubt Schreibzugriff auf deinen Bin. Teile ihn nur mit Personen, denen du vertraust, oder
> verwende – falls verfügbar – einen reinen Leseschlüssel (`X-Access-Key`).

## Arbeiten ohne Cloud

- Ohne Zugangsdaten speichert das Tagebuch ausschließlich lokal im Browser (`localStorage`).
- Sobald eine Cloud-Verbindung nicht verfügbar ist, wird automatisch in den lokalen Modus gewechselt. Ein
  Hinweisbanner informiert darüber.
- Bei bestehender Cloud-Verbindung werden alle Einträge zusätzlich lokal gespiegelt, damit du immer ein Backup
  auf dem Gerät behältst.

## Deployment

1. Lade `index.html` (und optional `cloud-config.js`, falls du die Zugangsdaten fest hinterlegen möchtest) auf
   deinen Webspace oder Host hoch.
2. Der Aufruf der Seite genügt – alle Funktionen laufen vollständig im Browser, ein Server ist nicht nötig.
3. Für Tests kannst du lokal `python -m http.server` starten und `http://localhost:8000/index.html` öffnen.

Viel Erfolg beim Führen des Tagebuchs! 🤍
