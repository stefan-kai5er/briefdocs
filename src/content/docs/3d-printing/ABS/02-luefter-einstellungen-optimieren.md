---
title: 'Den Bauteillüfter korrekt einsetzen'
description: 'Die richtige Strategie für die Bauteilkühlung bei ABS ist entscheidend. Hier lernst du, wie es geht.'
---

Die Bauteilkühlung bei ABS ist heikel. Die goldene Regel lautet: **Gleichmäßigkeit**. ABS reagiert extrem empfindlich auf plötzliche Temperaturänderungen, die zu Spannungen, Rissen und Verzug führen.

### Grundsatz: So wenig wie möglich, so viel wie nötig

Im Idealfall drucken wir ABS **komplett ohne Bauteillüfter**. Bei großen, technischen Teilen ohne extreme Überhänge ist dies der beste Weg, um maximale Schichthaftung und Stabilität zu erreichen.

Kleine Teile oder solche mit feinen Details und Überhängen benötigen jedoch Kühlung, da die Schichtzeit so kurz ist, dass die untere Schicht beim Auftrag der nächsten noch zu weich ist.

:::danger[VERMEIDEN: Automatische Lüftersteuerung nach Schichtzeit]
Die Standardeinstellung in vielen Slicern ist, die Lüftergeschwindigkeit dynamisch zu erhöhen, wenn eine Schichtzeit unter einen bestimmten Wert fällt. **Diese Funktion ist für den ABS-Druck oft schädlich!**

**Beispiel-Problem:**
1.  Eine große, langsame Schicht (z.B. eine Oberfläche) wird ohne Lüfter gedruckt und beginnt langsam abzukühlen.
2.  Darauf folgt eine kleine, schnelle Schicht. Der Lüfter schaltet sich plötzlich ein.
3.  Der Luftstrom kühlt nicht nur die neue, kleine Schicht, sondern trifft auch auf die bereits abkühlende Schicht darunter und verursacht einen Temperaturschock. Das Ergebnis ist sofortiger Verzug oder ein Riss.
:::

### Die richtige Strategie

Anstatt einer dynamischen Regelung nutzen wir eine Kombination aus Geschwindigkeitsanpassung und gezielter Kühlung:

1.  **Geschwindigkeit bei kurzen Schichten reduzieren:** Im Slicer stellst du ein, dass der Drucker langsamer wird, wenn die Schichtzeit zu kurz ist. So hat die Schicht Zeit zum Abkühlen, ohne dass ein kalter Luftstoß benötigt wird.
2.  **Manuelle Kühlung für kritische Bereiche:** Wenn ein Überhang oder eine Brücke absolut Kühlung benötigt, definiere dies im Slicer manuell (z.B. durch Custom Gcode). So wird der Lüfter nur dort und nur dann aktiviert, wo es unvermeidbar ist.
3.  **Die Position deines Bauteillüfters beachten:** Einige Bauteillüfter kühlen das Bauteil asymmetrisch (z.B. nur von einer Seite oder aus einer bestimmten Richtung).
    -   Richte dein Bauteil im Slicer so aus, dass kritische Überhänge zur primären Kühlseite des Lüfters zeigen.
    -   Bei langen, dünnen Teilen kann es sinnvoll sein, die kürzere Seite des Bauteils zur Lüfterseite zu orientieren, um eine gleichmäßigere Kühlung zu erreichen.

Dieser manuelle Ansatz gibt dir die volle Kontrolle und sorgt für die dringend benötigte Gleichmäßigkeit der Temperaturen.