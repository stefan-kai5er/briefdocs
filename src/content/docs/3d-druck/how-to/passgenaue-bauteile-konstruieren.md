---
title: "Passgenaue und saubere Bauteile konstruieren"
description: "Grundlegende Design-Regeln, um die typischen Ungenauigkeiten des FDM-Drucks auszugleichen und eine bessere Oberflächenqualität zu erzielen."
---

Ein gutes 3D-Druck-Ergebnis beginnt bereits im CAD-Programm. Anstatt Perfektion vom Drucker zu erwarten, können wir Bauteile von vornherein so gestalten, dass sie die Stärken des FDM-Verfahrens ausnutzen und dessen Schwächen kompensieren.

Dieses Briefdoc fasst die wichtigsten Konstruktionsprinzipien zusammen, um passgenaue und saubere Bauteile zu erhalten. Er basiert auf den fundamentalen Erkenntnissen aus dem exzellenten Artikel [Design for 3D Printing von Rahix](https://blog.rahix.de/design-for-3d-printing/).

:::briefing[Briefing]

- **Kanten:** Horizontale Kanten (Unterseiten) erhalten eine **Fase (Chamfer)** für saubere Überhänge. Vertikale Kanten eine **Abrundung (Fillet)** für glatte Oberflächen.
- **Löcher:** Werden als **Tropfenform (Teardrop)** designt, um die Z-Naht zu verstecken (vertikal) oder Überhänge zu vermeiden (horizontal).
- **Presspassungen:** Funktionieren am besten mit Geometrien, die sich gezielt verformen können, wie **sechseckige Löcher**, **"Crush Ribs"** (permanent) oder **"Grip Fins"** (lösbar).
  :::

## 1. Kanten richtig gestalten: Fasen vs. Abrundungen

Scharfe 90-Grad-Kanten sind in der realen Welt selten und im 3D-Druck oft problematisch. Die richtige Behandlung von Kanten verbessert die Druckqualität und die Haptik des Bauteils enorm.

:::tip[Die goldene Regel für Kanten]

- **Horizontale Kanten** (parallel zum Druckbett) bekommen eine **Fase (Chamfer)**.
- **Vertikale Kanten** (senkrecht zum Druckbett) bekommen eine **Abrundung (Fillet)**.
  :::

#### Horizontale Kanten: Fasen für saubere Überhänge

- **Problem:** Eine Abrundung an einer Unterkante beginnt mit einem 90-Grad-Überhang, was fast immer zu unsauberen, durchhängenden Kanten führt.
- **Lösung:** Eine 45-Grad-Fase ist hingegen ein selbsttragender Überhang und führt zu einer scharfen und präzisen Kante.

#### Vertikale Kanten: Abrundungen für glatte Oberflächen

- **Problem:** An scharfen vertikalen Ecken muss der Druckkopf abrupt seine Richtung ändern, was Vibrationen und "Geisterbilder" (Ringing) erzeugt.
- **Lösung:** Eine Abrundung ermöglicht dem Drucker eine sanfte Kurve mit konstanterer Geschwindigkeit, was zu einer glatteren Oberfläche führt.

---

## 2. Perfekte Löcher für Schrauben und Stifte

Löcher sind im FDM-Druck selten perfekt rund oder maßhaltig. Mit Tropfenformen (Teardrops) lässt sich dieses Problem im CAD allerdings elegant lösen.

#### Vertikale Löcher: Z-Naht verstecken

- **Problem:** Die Z-Naht erzeugt eine kleine Beule an der Wand des Lochs, was die Passgenauigkeit stört.
- **Lösung:** Gestalten Sie das Loch als leichte Tropfenform (Teardrop). Der Slicer platziert die Naht in der scharfen Ecke, und der runde Teil des Lochs bleibt sauber.

:::note[Hinweis]
In FreeCAD kann man mit dem Addon "FusedFilamentDesign" solche Geometrien automatisch erzeugen.
:::

#### Horizontale Löcher: Überhänge stützen

- **Problem:** Die oberen Schichten eines horizontalen Lochs sacken ohne Stützmaterial ab.
- **Lösung:** Konstruieren Sie das Loch von Anfang an als Tropfenform. Die 45-Grad-Schrägen sind selbsttragend und ergeben ein sauberes, rundes Loch.

![Teardrop-Horizontal](/pictures/passgenaue-bauteile/Horizontal-Holes.png)
![Teardrop-Vertical](/pictures/passgenaue-bauteile/Teardrop-Vertical.png)[^1]

---

## 3. Presspassungen, die funktionieren

- **Problem:** Ein runder Stift in einem runden Loch erzeugt hohe Spannungen und führt oft zum Aufspalten der Layer.
- **Lösung:** Konstruieren Sie das Loch so, dass es gezielt nachgeben kann.
  - **Sechseckige Löcher:** Ein runder Stift in einem sechseckigen Loch hat mehrere definierte Kontaktpunkte. Die flachen Wände dazwischen können sich leicht biegen und Toleranzen ausgleichen, ohne das Bauteil zu sprengen.
  - **"Crush Ribs":** Fügen Sie dem Loch kleine, vorstehende Rippen hinzu. Diese Rippen verformen sich beim Einpressen gezielt und sorgen für einen festen, spielfreien Sitz. Ideal für einmalige, permanente Verbindungen.

---

## 4. Einstellbarkeit statt Perfektion

Manchmal sind kleinere Toleranzen erforderlich, als der Drucker liefern kann.

> Wenn du es nicht präzise machen kannst, mach es einstellbar.

- **Problem:** Bauteile müssen exakt ausgerichtet werden, aber kleine Druckungenauigkeiten verhindern dies.
- **Lösung:**
  - Verwenden Sie **Langlöcher** statt runder Löcher, um die Position eines Bauteils feinjustieren zu können.
  - Nutzen Sie **Einstellschrauben**, um eine Position millimetergenau zu fixieren.

![Hole-Adjustment](/pictures/passgenaue-bauteile/oblong-hole-adjustment.jpg)[^1]

## Fazit & Empfehlung

Intelligentes CAD-Design schlägt oft mühsames Drucker-Tuning. Anstatt stundenlang Kalibrierungswürfel zu drucken, lassen sich die verfahrensbedingten Schwächen des FDM-Drucks (wie Überhänge und Z-Nähte) durch Fasen, Tropfenformen und nachgebende Passungen direkt in der Konstruktion kompensieren.

[^1]: [Design for 3D Printing von Rahix](https://blog.rahix.de/design-for-3d-printing/)
