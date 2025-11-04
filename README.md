# Medikinet-Tagebuch

Dieses Projekt besteht ausschließlich aus statischen HTML-Dateien. Öffne dafür einfach die
`index.html` im Browser oder lade das Repository in einen beliebigen statischen Webhost hoch (z. B.
GitHub Pages). Es werden keine zusätzlichen Abhängigkeiten oder Build-Schritte benötigt.

> ℹ️  `index.html` ist die lokale Offline-Version, `index-cloud.html` synchronisiert die Daten über JSONBin.
> Beide Dateien können parallel im Projekt bleiben – wähle beim Veröffentlichen einfach die Variante, die
> du einsetzen möchtest.

## Lokale Nutzung

1. Repository herunterladen oder klonen.
2. Die Datei `index.html` im Browser öffnen. Alternativ kann mit `python -m http.server` ein kleiner
   Entwicklungsserver gestartet werden.
3. Alle Eingaben bleiben ausschließlich im jeweiligen Browser gespeichert.

Für ältere Lesezeichen verweist `medikinet-tagebuch.html` automatisch auf die neue Startseite.

Die Oberfläche ist responsiv gestaltet. Auf Smartphones werden Formularaktionen automatisch gestapelt
und der Verlauf als kompakte Kartenliste dargestellt.

Im Formular können neben den bisherigen Angaben jetzt auch einzelne Nebenwirkungen (Kopfweh, Bauchweh,
Schwindel) sowie auffällige Ausbrüche angehakt werden. Jeder gespeicherte Tag lässt sich anschließend
gezielt über die Verlaufsliste löschen – eine globale Löschfunktion gibt es nicht mehr.

## Cloud-Speicher-Variante (JSONBin)

Die Cloud-Version (`index-cloud.html`) speichert alle Tagebucheinträge gesammelt in einem JSONBin. Jeder
Eintrag lässt sich einzeln löschen, ein globaler „Alles löschen“-Knopf wurde bewusst entfernt.

1. Kopiere `cloud-config.example.js` zu `cloud-config.js` und trage dort deine JSONBin-Daten ein:

   ```js
   window.MEDIKINET_CLOUD_CONFIG = {
     binId: "dein-jsonbin-bin-id",
     masterKey: "dein-jsonbin-master-key",
     accessKey: "optional" // nur falls in JSONBin vergeben
   };
   ```

2. Erstelle bei [jsonbin.io](https://jsonbin.io) ein Konto, lege unter „Bins“ einen neuen Eintrag mit dem
   Inhalt `{ "entries": [] }` an und notiere dir die generierte Bin-ID (z. B. `64f3a6e1baf6031234567890`).
3. Im JSONBin-Dashboard findest du unter **API Keys** den `X-Master-Key`. Dieser ist zum Schreiben nötig
   und wird in `masterKey` eingetragen. Optional kannst du zusätzlich einen `X-Access-Key` (reiner
   Leseschlüssel) hinterlegen und in der Konfiguration unter `accessKey` eintragen.
4. Lade `index-cloud.html` zusammen mit der angepassten `cloud-config.js`. Nach dem Laden holt sich die
   Seite den kompletten Verlauf aus dem JSONBin, zeigt den Synchronisationsstatus im Banner an und sorgt
   beim Speichern bzw. Löschen dafür, dass der Bin jeweils vollständig aktualisiert wird.

> ⚠️ Der `masterKey` erlaubt Schreibzugriff auf den Bin. Teile die Cloud-Variante deshalb nur mit Personen,
> denen du vertraust, oder setze – falls verfügbar – einen eingeschränkten Access-Key für reine Leserechte
> ein.

## Veröffentlichen / Hochladen

Sowohl die Offline-Variante (`index.html`) als auch die Cloud-Version (`index-cloud.html`) sind normale
statische Webseiten. Du kannst sie deshalb auf jeden beliebigen Hoster laden, der statische Dateien
bedient.

### 1. Dateien vorbereiten

* **Offline-Variante:** Lade mindestens `index.html` sowie optionale Assets (z. B. `medikinet-tagebuch.html`)
  hoch. Weitere Konfigurationen sind nicht erforderlich.
* **Cloud-Variante:** Kopiere lokal `cloud-config.example.js` nach `cloud-config.js`, trage dort Bin-ID und
  Schlüssel ein und lade beide Dateien zusammen mit `index-cloud.html` hoch. Der `masterKey` gewährt
  Schreibrechte auf deinen JSONBin – veröffentliche ihn daher nur auf vertrauenswürdigen Seiten oder nutze
  einen Access-Key mit eingeschränkten Rechten.

### 2. Upload durchführen

Einige typische Wege, die du nutzen kannst:

* **GitHub Pages:** Lege ein Repository an, füge die Dateien hinzu, aktiviere Pages (Branch `main`, Ordner
  `/`). GitHub baut nichts, sondern liefert die HTML-Dateien direkt aus.
* **Netlify / Vercel:** Ziehe den Projektordner per Drag-and-drop ins Dashboard oder verbinde dein Git-Repo.
  Beide Dienste erkennen die statische Seite automatisch, da kein Build-Schritt nötig ist.
* **Eigenes Hosting / FTP:** Lade die Dateien via FTP/SFTP/WebDAV in das Dokumentenverzeichnis deines
  Servers hoch. `index.html` bzw. `index-cloud.html` werden dann als Startseite ausgeliefert.

Nach dem Hochladen erreichst du die jeweilige Variante über die vom Hoster bereitgestellte URL. Wenn du
beide Varianten bereitstellen möchtest, lege beispielsweise zwei Unterordner an (`/lokal`, `/cloud`) oder
verlinke die gewünschte Datei manuell.
