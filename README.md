# 📝 Briefdocs

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

**Meine persönliche Wissensbasis. Eine stetig wachsende Sammlung von kurzen Notizen, Snippets und Anleitungen.**

🔗 **Live ansehen:** [briefdocs.org](https://briefdocs.org)

## 🧠 Über dieses Projekt

Briefdocs ist mein "externes Gehirn". Ich habe dieses Projekt ins Leben gerufen, um Dinge, die ich lerne oder konfiguriere, an einem zentralen Ort zu dokumentieren, damit ich sie in Zukunft schnell wiederfinde.

Statt diese Notizen lokal auf meinem Rechner verstauben zu lassen, habe ich mich entschieden, sie als Open-Source-Projekt öffentlich zugänglich zu machen. Vielleicht ist die eine oder andere Anleitung ja auch für jemand anderen nützlich!

## 🤝 Mitmachen (Contributing)

Da dies in erster Linie mein persönliches Nachschlagewerk ist, gibt es keine strikte Roadmap. Dennoch freue ich mich über Beteiligung aus der Community!

- **Fehler gefunden?** Wenn du einen Rechtschreibfehler, einen kaputten Link oder einen inhaltlichen Fehler entdeckst, erstelle gerne ein Issue oder direkt einen **Pull Request**.
- **Ergänzungen:** Sinnvolle Ergänzungen zu bestehenden Themen sind immer willkommen.
- **Quellen & Urheberrecht:** Ein wichtiger Grundsatz für Briefdocs ist der Respekt vor den ursprünglichen Autoren. Wenn du etwas beisteuerst, achte bitte darauf, keine ganzen Texte 1:1 von anderen Seiten zu kopieren. Fasse Inhalte in eigenen Worten zusammen und verlinke **immer** die Originalquelle unter "Quellen & weiterführende Links".

### Commit-Nachrichten

Briefdocs nutzt **Bereichs-Präfixe** – dieselbe Konvention wie das Git-Projekt selbst. Vorne steht, _welcher Teil_ betroffen ist, danach im Imperativ, _was_ sich ändert:

```
bereich: was sich ändert

Optionaler Rumpf, der erklärt, warum – nicht, wie.
```

| Präfix                          | Bereich                                  |
| ------------------------------- | ---------------------------------------- |
| `3d-druck:`, `ueber-briefdocs:` | Inhalte, benannt nach dem Themengebiet   |
| `viewer:`                       | Die 3D-Viewer-Komponente                 |
| `models:`                       | 3D-Modelle und ihre Pipeline             |
| `site:`                         | Starlight-Konfiguration, Layout, Styling |
| `build:`                        | Abhängigkeiten, Skripte, Formatierung    |
| `ci:`                           | GitHub Actions                           |
| `repo:`                         | README, Lizenz, Vorlagen                 |

Kommt ein neues Themengebiet dazu, kommt einfach ein neues Präfix dazu – benannt nach dem Ordner unter `src/content/docs/`.

Zwei Faustregeln: **Imperativ** in der Betreffzeile („füge hinzu", nicht „hinzugefügt"), und der Rumpf beantwortet das **Warum**. Das _Wie_ steht bereits im Diff.

## 🛠️ Lokale Entwicklung

Briefdocs wurde mit [Astro Starlight](https://starlight.astro.build/) gebaut. Als JavaScript runtime nutze ich **[Bun](https://bun.sh/)**.

Wenn du das Projekt lokal bei dir laufen lassen möchtest:

1. Repository klonen:
   ```bash
   git clone https://github.com/stefan-kai5er/briefdocs.git
   cd briefdocs
   ```
2. Abhängigkeiten mit Bun installieren:
   ```bash
   bun install
   ```
3. Entwicklungsserver starten:
   ```bash
   bun dev
   ```

Das Projekt ist nun unter `http://localhost:4321` erreichbar.

### Nützliche Befehle

| Befehl           | Wirkung                                          |
| ---------------- | ------------------------------------------------ |
| `bun dev`        | Entwicklungsserver                               |
| `bun run build`  | Typcheck, Build und Prüfung aller internen Links |
| `bun run check`  | Nur der Typcheck                                 |
| `bun run format` | Code mit Prettier formatieren                    |
| `bun run models` | 3D-Modelle neu komprimieren (siehe unten)        |

### 3D-Modelle

Konstruiert wird in **[FreeCAD](https://www.freecad.org/)**. Die Quellmodelle liegen unter `assets/models-src/` und werden **nicht** ausgeliefert. `bun run models` erzeugt daraus die Meshopt-komprimierten `.glb`-Dateien in `public/models/`, die die Seite tatsächlich lädt – das spart rund 80 % Dateigröße.

Beim Austauschen eines Modells: Datei nach `assets/models-src/` legen, `bun run models` ausführen und **beide** Ordner committen.

#### Export aus FreeCAD

Wähle im Export-Dialog den Dateityp `glTF (*.gltf *.glb)` und gib dem Dateinamen die Endung **`.glb`**. FreeCAD führt beide Formate unter einem Filter, das Format ergibt sich also aus der Endung. `.glb` ist eine einzelne Datei, `.gltf` erzeugt zusätzlich eine separate `.bin` – inhaltlich sind beide identisch.

Der entscheidende Hebel für die Dateigröße ist die **Tessellierung** (Deviation), nicht das Dateiformat: Je feiner, desto glatter wirken Bohrungen und Rundungen – und desto größer die Datei. Bei einem Testzylinder ergab Deviation 0.1 rund 23 KB, Deviation 0.01 rund 35 KB. Für die meisten Bauteile ist ein mittlerer Wert der richtige Kompromiss.

> Das Skript liest auch `.gltf`. Die ältesten Quelldateien stammen noch aus Onshape und liegen in diesem Format im Repo, damit sie weiterhin neu verarbeitet werden können.

#### Beschriftungen

Der Viewer liest die Beschriftungen aus den Node-Namen. In FreeCAD ist das das **Label** eines Objekts, nicht der interne `Name` – das Label lässt sich frei umbenennen und kommt beim Export unverändert an:

| Label im Modellbaum      | Wirkung                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `_label_Text`            | Beschriftung über dem Bauteil                                    |
| `_ann_Text`              | Annotation mit Punkt und Linie, wird bei Verdeckung ausgeblendet |
| `_ann_Text --no-occlude` | Annotation, die immer sichtbar bleibt                            |

Unterstriche werden zu Leerzeichen. **Umlaute kannst du direkt schreiben** – glTF-Namen sind UTF-8, und FreeCAD gibt sie korrekt weiter.

Alternativ kannst du die Beschriftung als `label` in den glTF-`extras` des Nodes ablegen; der Viewer bevorzugt diesen Wert gegenüber dem Node-Namen.

## 📄 Lizenz

Briefdocs ist doppelt lizenziert, weil Code und Inhalte unterschiedliche Bedürfnisse haben:

| Was                                                                                 | Lizenz                       |
| ----------------------------------------------------------------------------------- | ---------------------------- |
| **Quellcode** (Komponenten, Konfiguration, Skripte)                                 | [MIT](LICENSE)               |
| **Inhalte** (`src/content/`, `src/assets/`, `public/models/`, `assets/models-src/`) | [CC BY 4.0](LICENSE-CONTENT) |

Du darfst die Inhalte also frei weiterverwenden und verändern, auch kommerziell – solange du Briefdocs als Quelle nennst.

Umgekehrt gilt derselbe Grundsatz auch hier: Briefdocs fasst fremde Erkenntnisse in eigenen Worten zusammen und verlinkt die Originalquellen. Die Lizenz deckt die hier verfassten Texte ab, nicht die verlinkten Originale.
