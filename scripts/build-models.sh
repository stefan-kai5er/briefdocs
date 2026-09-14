#!/usr/bin/env bash
# Konvertiert die glTF-Quellmodelle nach .glb mit Meshopt-Kompression.
#
# Quelle:  assets/models-src/**/*.{glb,gltf}   (im Repo, nicht deployed)
# Ziel:    public/models/**/*.glb              (deployed)
#
# Neue Modelle kommen als .glb aus FreeCAD. .gltf wird weiterhin gelesen,
# weil die aeltesten Quelldateien noch aus Onshape stammen und in diesem
# Format im Repo liegen.
#
# Warum Meshopt und nicht Draco: drei laedt den Draco-Decoder per Default
# von https://www.gstatic.com/ (siehe @react-three/drei core/Gltf.js).
# Der Meshopt-Decoder ist dagegen aus three-stdlib mitgebuendelt, also
# kein Request an ein fremdes CDN.
#
# Abgeschaltete Schritte -- alle vier sind hier nicht optional:
#
#   --simplify false   Die Modelle demonstrieren exakte 45-Grad-Winkel und
#                      Fasen. Eine Dezimierung der Geometrie waere inhaltlich
#                      falsch, nicht nur eine Qualitaetsfrage.
#   --flatten false    Flacht den Szenengraph ab. Der Viewer braucht die
#                      Eltern-Kind-Beziehung der "_ann_"-Nodes, um per
#                      findChildMeshes die eigenen Meshes von der
#                      Verdeckungspruefung auszunehmen.
#   --join false       Verschmilzt Meshes und Nodes. Loescht dabei die
#                      "_label_"/"_ann_"-Namen, aus denen der Viewer die
#                      Beschriftungen liest (gemessen: 10 Nodes -> 4).
#   --palette false    Fuehrt Materialien in Palettentexturen zusammen und
#                      kann das Erscheinungsbild der flach eingefaerbten
#                      CAD-Teile veraendern.
set -euo pipefail

SRC_DIR="assets/models-src"
OUT_DIR="public/models"

command -v bunx >/dev/null || { echo "bunx nicht gefunden" >&2; exit 1; }

shopt -s globstar nullglob

sources=("$SRC_DIR"/**/*.glb "$SRC_DIR"/**/*.gltf)

if [ ${#sources[@]} -eq 0 ]; then
  echo "Keine .glb- oder .gltf-Dateien unter $SRC_DIR gefunden." >&2
  exit 1
fi

# Erst pruefen, dann schreiben. Laegen foo.glb und foo.gltf nebeneinander,
# wuerde die zweite Datei die erste stillschweigend ueberschreiben -- und
# eine Pruefung mitten in der Schleife haette das erste Ziel bereits
# zerstoert, bevor sie anschlaegt.
declare -A seen=()
for src in "${sources[@]}"; do
  rel="${src#"$SRC_DIR"/}"
  out="$OUT_DIR/${rel%.*}.glb"
  if [ -n "${seen[$out]:-}" ]; then
    echo "Konflikt: $rel und ${seen[$out]} ergeben beide $out" >&2
    exit 1
  fi
  seen[$out]="$rel"
done

for src in "${sources[@]}"; do
  rel="${src#"$SRC_DIR"/}"
  out="$OUT_DIR/${rel%.*}.glb"
  mkdir -p "$(dirname "$out")"

  echo "→ $rel"
  bunx gltf-transform optimize "$src" "$out" \
    --compress meshopt \
    --simplify false \
    --flatten false \
    --join false \
    --instance false \
    --palette false \
    --texture-compress webp

  before=$(wc -c < "$src")
  after=$(wc -c < "$out")
  echo "  $((before / 1024)) KB → $((after / 1024)) KB"
done
