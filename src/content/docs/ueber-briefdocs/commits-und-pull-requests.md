---
title: Commits und Pull Requests
description: Wie Änderungen an Briefdocs in Commits geschnitten, beschrieben und über einen Pull Request auf master gebracht werden.
sidebar: { order: 2 }
---

Eine saubere Git-Historie ist die Dokumentation der Dokumentation: Sie beantwortet in einem Jahr noch, _warum_ etwas so ist, wie es ist. Dieser Briefdoc hält fest, wie Änderungen an Briefdocs committet und gemergt werden – vom ersten `git add` bis zum Aufräumen danach. Die Konvention stammt aus den [SubmittingPatches-Richtlinien des Git-Projekts](https://git-scm.com/docs/SubmittingPatches), die wiederum auf die [Linux-Kernel-Richtlinien](https://www.kernel.org/doc/html/latest/process/submitting-patches.html) zurückgehen.

:::briefing[Briefing]
Pro logischer Änderung ein Commit. Die Betreffzeile lautet `bereich: was sich ändert` – im Imperativ, klein, ohne Punkt, unter 50 Zeichen. Der Rumpf erklärt das **Warum**. Auf master kommt alles über einen Branch und einen Pull Request, gemergt **ohne Squash**. Den Branch erst löschen, **nachdem** der PR gemergt ist.
:::

## 1. Die Commit-Nachricht

```
bereich: was sich ändert

Rumpf: Welches Problem gab es ohne diese Änderung,
und warum ist die Lösung so gewählt?
```

### Der Bereich

Vorne steht, _welcher Teil_ des Projekts betroffen ist:[^1]

| Präfix                          | Bereich                                  |
| ------------------------------- | ---------------------------------------- |
| `3d-druck:`, `ueber-briefdocs:` | Inhalte, benannt nach dem Themengebiet   |
| `viewer:`                       | Die 3D-Viewer-Komponente                 |
| `models:`                       | 3D-Modelle und ihre Pipeline             |
| `site:`                         | Starlight-Konfiguration, Layout, Styling |
| `build:`                        | Abhängigkeiten, Skripte, Formatierung    |
| `ci:`                           | GitHub Actions                           |
| `repo:`                         | README, Lizenz, Vorlagen                 |

Kommt ein neues Themengebiet dazu, kommt ein neues Präfix dazu – benannt nach dem Ordner unter `src/content/docs/`.

:::tip[Welcher Bereich, wenn es mehrere sind?]
Passt ein Commit in zwei Bereiche, ist das meist ein Zeichen, dass er zwei Änderungen enthält. Dann lieber aufteilen (siehe Abschnitt 2). Ist die Änderung wirklich untrennbar, gewinnt der Bereich, um den es _eigentlich_ geht.
:::

### Die Betreffzeile

- **Imperativ:** so formuliert, als würdest du dem Code einen Befehl geben.[^2] `fix landing page cards link`, nicht `fixed …` oder `fixes …`.
- **Klein und ohne Punkt:** Das erste Wort nach dem Präfix wird kleingeschrieben, am Ende steht kein Punkt.
- **Kurz:** 50 Zeichen sind die weiche Grenze. Wird es länger, gehört der Rest in den Rumpf.
- **Englisch:** Wie die bisherige Historie. Inhalte der Seite bleiben natürlich deutsch.

### Der Rumpf

Der Rumpf ist optional, bei allem Nicht-Trivialen aber Pflicht. Er beantwortet, **was ohne die Änderung falsch war** und **warum die Lösung besser ist** – verworfene Alternativen dürfen auch rein.[^3] Das _Wie_ muss nicht drinstehen, das zeigt der Diff.

```
3d-druck: fix landing page cards link

Starlight's Card has no href prop and silently drops it, so the
three cards on /3d-druck/ were never clickable. LinkCard is the
component meant for this.
```

## 2. Commits schneiden

Ein Commit ist **eine logische Änderung**, die für sich allein verständlich und begründbar ist.[^4] Formatierung, Fehlerbehebung und neue Funktion sind drei Commits, auch wenn sie in derselben Datei stecken.

Liegen mehrere Änderungen in einer Datei, lassen sie sich stückweise stagen:

```bash
git add -p datei.md   # jeden Abschnitt einzeln: y = aufnehmen, n = auslassen, s = weiter aufteilen
git diff --cached     # prüfen, was wirklich im Commit landet
git commit
```

`git commit` ohne `-m` öffnet den Editor – so schreibst du Betreff und Rumpf bequem getrennt.

### Nachträglich korrigieren

Solange der Branch **noch nicht gemergt** ist, darfst du seine Historie umbauen:

| Situation                                | Befehl                                   |
| ---------------------------------------- | ---------------------------------------- |
| Letzte Nachricht falsch                  | `git commit --amend`                     |
| Etwas im letzten Commit vergessen        | `git add …` und `git commit --amend`     |
| Ältere Nachricht falsch                  | `git rebase -i master`, Zeile auf `reword` |
| Bereits gepushten Branch überschreiben   | `git push --force-with-lease`            |

`--force-with-lease` statt `--force`: Es bricht ab, wenn auf dem Remote inzwischen etwas liegt, das du lokal nicht kennst.

:::caution[Nie auf master]
Umgeschrieben wird nur auf dem eigenen Branch. Die Historie von master bleibt unangetastet – sonst passen Klone und Deployments nicht mehr dazu.
:::

## 3. Der Weg auf master

1. **Branch anlegen** – ein Name, der das Vorhaben beschreibt:
   ```bash
   git checkout master && git pull
   git checkout -b gewinde-ergaenzen
   ```
2. **Committen** wie oben beschrieben.
3. **Lokal prüfen**, dasselbe, was die CI prüft:
   ```bash
   bun run format:check && bun run build
   ```
4. **Pushen:**
   ```bash
   git push -u origin gewinde-ergaenzen
   ```
5. **Pull Request öffnen.** GitHub zeigt nach dem Push einen Link dazu an. Die Beschreibung füllt sich aus der PR-Vorlage; die Checkliste abhaken.
6. **CI abwarten.** Der Check muss grün sein.
7. **Mergen** mit **„Create a merge commit"** oder **„Rebase and merge"**.

:::danger[Nicht „Squash and merge"]
Squash fasst alle Commits des PRs zu einem einzigen zusammen.[^5] Die sorgfältig geschnittenen Commits und ihre Begründungen gehen dabei verloren.
:::

## 4. Aufräumen – erst nach dem Merge

Erst wenn der PR auf GitHub als **„Merged"** (lila) markiert ist:

```bash
git checkout master && git pull
git branch -d gewinde-ergaenzen
git push origin --delete gewinde-ergaenzen
```

:::danger[„Close" ist nicht „Merge"]
Unten im PR sitzt **„Close pull request"** direkt neben dem Kommentar-Button. Ein geschlossener PR ist **nicht** gemergt – danach bietet GitHub trotzdem „Delete branch" an. Maßgeblich ist nur das lila **„Merged"**. Lokal schützt `git branch -d` (kleines d): Es verweigert das Löschen eines nicht gemergten Branches. `-D` (groß) löscht trotzdem.
:::

Ist es doch passiert, sind die Commits nicht weg. Git merkt sich jede frühere Position im Reflog:

```bash
git reflog                               # den letzten Commit des Branches suchen
git branch gewinde-ergaenzen <hash>      # Branch dort wiederherstellen
git push -u origin gewinde-ergaenzen     # und einen neuen PR öffnen
```

## Fazit & Empfehlung

Die Konvention kostet pro Commit wenige Sekunden: einen Bereich wählen, im Imperativ formulieren, das Warum aufschreiben. Dafür lässt sich mit `git log --oneline` jederzeit überblicken, was sich wo geändert hat, und `git log -- src/components/` erzählt die Geschichte eines Bereichs. Die Kurzfassung der Präfixe steht zusätzlich in der README, damit sie auch beim Arbeiten im Repo griffbereit ist. Wer tiefer einsteigen will, findet in [How to Write a Git Commit Message](https://cbea.ms/git-commit/) eine gut begründete Zusammenfassung der Regeln.

[^1]: Das Git-Projekt beschreibt das Präfix als „a filename or identifier for the general area of the code being modified", siehe [SubmittingPatches](https://git-scm.com/docs/SubmittingPatches). Der Linux-Kernel nennt es das `subsystem`.
[^2]: „as if you are giving orders to the codebase to change its behavior", [SubmittingPatches](https://git-scm.com/docs/SubmittingPatches).
[^3]: Die drei Punkte Problem, Begründung und verworfene Alternativen stammen direkt aus [SubmittingPatches](https://git-scm.com/docs/SubmittingPatches).
[^4]: „Each patch should be justifiable on its own merits", [Linux-Kernel: Submitting patches](https://www.kernel.org/doc/html/latest/process/submitting-patches.html).
[^5]: [GitHub Docs: About pull request merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges).
