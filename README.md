# Medikinet-Tagebuch

Dieses Projekt besteht ausschließlich aus statischen HTML-Dateien. Öffne dafür einfach die
`index.html` im Browser oder lade das Repository in einen beliebigen statischen Webhost hoch (z. B.
GitHub Pages). Es werden keine zusätzlichen Abhängigkeiten oder Build-Schritte benötigt.

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
2. Lege in Supabase eine Tabelle `medikinet_entries` mit folgenden Spalten an:

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

3. Aktiviere Row Level Security (RLS) und erstelle Policies, die anonymes Lesen sowie Upserts durch den
   `anon`-Key erlauben (z. B. `using (true)` / `with check (true)` für `select`, `insert`, `update`,
   `delete`).
4. Öffne `index-cloud.html` nach erfolgter Konfiguration. Die Seite synchronisiert alle Einträge
   automatisch mit Supabase und zeigt den Status im oberen Hinweisbereich an.

> ⚠️ Bitte stelle sicher, dass dein Supabase-Projekt nur vertrauenswürdigen Personen zugänglich ist. Für
> produktive Szenarien sollten Policies so eingeschränkt werden, dass nur authentifizierte Benutzer auf
> ihre eigenen Daten zugreifen können.
