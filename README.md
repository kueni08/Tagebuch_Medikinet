# Medikinet-Tagebuch

Dieses Projekt besteht ausschließlich aus statischen HTML-Dateien. Öffne dafür einfach die
`index.html` im Browser oder lade das Repository in einen beliebigen statischen Webhost hoch (z. B.
GitHub Pages). Es werden keine zusätzlichen Abhängigkeiten oder Build-Schritte benötigt.

> ℹ️  `index.html` ist die lokale Offline-Version, `index-cloud.html` bindet Supabase an. Lass beide
> Dateien im Projekt und verlinke je nach Einsatzzweck die gewünschte Variante.

## Lokale Nutzung

1. Repository herunterladen oder klonen.
2. Die Datei `index.html` im Browser öffnen. Alternativ kann mit `python -m http.server` ein kleiner
   Entwicklungsserver gestartet werden.
3. Alle Eingaben bleiben ausschließlich im jeweiligen Browser gespeichert.

Für ältere Lesezeichen verweist `medikinet-tagebuch.html` automatisch auf die neue Startseite.

Die Oberfläche ist responsiv gestaltet. Auf Smartphones werden Formularaktionen automatisch gestapelt
und der Verlauf als kompakte Kartenliste dargestellt.

## Cloud-Speicher-Variante (Supabase)

Zusätzlich zur lokalen Variante gibt es eine Version, die die Einträge mit einer Supabase-Datenbank
synchronisiert (`index-cloud.html`).

1. Kopiere `cloud-config.example.js` zu `cloud-config.js` und trage dort deine Supabase-URL, den
   `public-anon`-Key sowie den Tabellennamen ein. Du findest URL und Key im Supabase-Dashboard unter
   **Project Settings → API** (Abschnitt „Project URL“ und „anon public“).
2. Lege in Supabase eine Tabelle `medikinet_entries` mit folgenden Spalten an (über den SQL-Editor
   oder indem du sie im Tabellen-Designer exakt so anlegst):

   ```sql
   create table if not exists public.medikinet_entries (
     datum date primary key,
     stimmung text,
     konz text,
     vorm text,
     abend text,
     ausbr boolean default false,
     auff text
   );
   ```

   > 📌 Die Spaltennamen müssen exakt übereinstimmen, damit die Cloud-Seite die Daten korrekt lesen und
   > schreiben kann. Zusätzliche Felder sind nicht nötig.

3. Aktiviere Row Level Security (RLS) und erstelle Policies, die anonymes Lesen sowie Upserts durch den
   `anon`-Key erlauben (z. B. `using (true)` / `with check (true)` für `select`, `insert`, `update`,
   `delete`).
4. Öffne `index-cloud.html` nach erfolgter Konfiguration. Die Seite synchronisiert alle Einträge
   automatisch mit Supabase und zeigt den Status im oberen Hinweisbereich an.

> ⚠️ Bitte stelle sicher, dass dein Supabase-Projekt nur vertrauenswürdigen Personen zugänglich ist. Für
> produktive Szenarien sollten Policies so eingeschränkt werden, dass nur authentifizierte Benutzer auf
> ihre eigenen Daten zugreifen können.

## Veröffentlichen / Hochladen

Sowohl die Offline-Variante (`index.html`) als auch die Cloud-Version (`index-cloud.html`) sind normale
statische Webseiten. Du kannst sie deshalb auf jeden beliebigen Hoster laden, der statische Dateien
bedient.

### 1. Dateien vorbereiten

* **Offline-Variante:** Lade mindestens `index.html` sowie optionale Assets (z. B. `medikinet-tagebuch.html`)
  hoch. Weitere Konfigurationen sind nicht erforderlich.
* **Cloud-Variante:** Kopiere lokal `cloud-config.example.js` nach `cloud-config.js`, trage dort deine
  Supabase-Zugangsdaten ein und lade beide Dateien zusammen mit `index-cloud.html` hoch. Achte darauf, dass
  du den `anon`-Key nur dort veröffentlichst, wo er öffentlich sein darf (z. B. auf deiner eigenen Website).

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
