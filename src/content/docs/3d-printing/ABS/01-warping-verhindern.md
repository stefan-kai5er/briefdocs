---
title: 'Warping verhindern'
description: 'Eine schrittweise Anleitung zur Lösung von Verzug und schlechter Schichthaftung bei ABS.'
---

Das häufigste und frustrierendste Problem beim Drucken mit ABS ist der Verzug (Warping), bei dem sich die Ecken des Bauteils vom Druckbett heben. Dies geschieht durch die thermische Kontraktion des Materials, wenn es ungleichmäßig oder zu schnell abkühlt.

Die grundlegende Lösung ist einfach: **So viel Wärme wie möglich im Bauteil und in der Umgebung halten.**


### 1. Gehäusetemperatur maximieren

Eine warme und stabile Umgebungstemperatur ist der Schlüssel. Das Ziel sind **mindestens 40°C** im Inneren des Druckers.

-   **Belüftungsschlitze verschließen:** Es wird empfohlen, etwaige seitliche Belüftungsschlitze des Druckergehäuses zu verschließen (z.B. mit Klebeband). Dies reduziert den Wärmeverlust erheblich.
-   **Türen geschlossen halten:** Halte die Türen während des gesamten Drucks geschlossen.

### 2. Druckbett- und Düsentemperatur optimieren

Wir müssen Energie in das Bauteil einbringen, damit es während des gesamten Drucks weich und spannungsarm bleibt.

-   **Druckbetttemperatur:** **100°C** für alle Schichten. Das sorgt für eine solide Basis und verhindert das Abheben der ersten Schichten.
-   **Düsentemperatur:** **260°C**. Diese Temperatur verbessert die Schichthaftung und ermöglicht einen guten Materialdurchfluss. (Hinweis: Die exakte Temperatur kann je nach spezifischem ABS-Filament variieren und sollte bei Bedarf im Rahmen von 240-270°C angepasst werden.)

### 3. Schnell drucken, um Energie einzubringen

Es mag kontraintuitiv klingen, aber schnelleres Drucken hilft, die Gesamttemperatur des Bauteils hoch zu halten, da heiße Schichten schneller aufeinander folgen.

-   **Maximalen Durchfluss nutzen:** Ein optimiertes Slicer-Profil sollte darauf ausgelegt sein, den maximalen Volumendurchfluss des Extruders auszunutzen. Dadurch wird konstant viel heißes Material gefördert.

### 4. Spezielle Slicer-Einstellungen

Einige kleine Anpassungen im Slicer haben eine große Wirkung:

-   **Schichthöhe:** Wir verwenden **0.20mm**. Dies ist ein guter Standardwert, um schnell warmes Material aufzutragen und gleichzeitig eine gute Druckqualität zu erhalten.
-   **Breite der Außenwand:** Die äußerste Linie ("Outer Wall") wird mit **150% Linienbreite** gedruckt.
    -   **Vorteil 1:** Die Wand wird dicker und stabiler.
    -   **Vorteil 2:** Die Geschwindigkeit für diese Linie kann reduziert werden, was die Oberflächenqualität verbessert.
    -   **Vorteil 3:** Die Maßhaltigkeit des Bauteils kann erhöht werden.
    -   **Vorteil 4:** Es verbessert die Haftung zwischen den Wänden und die Überhangleistung.

:::tip[Nach dem Druck]
Lass das Bauteil **vollständig** auf dem Druckbett abkühlen. Wenn das Bett auf Raumtemperatur zurückgekehrt ist, löst sich das Teil oft von ganz allein oder mit minimalem Aufwand. Geduld verhindert hier die Beschädigung von Bauteil und Druckplatte.
:::