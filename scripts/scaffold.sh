#!/bin/bash
# Creates the projects/ folder structure for cleavetech.com
# Run from the repo root in Git Bash

STUB='\n\n  \n    \n    \n    \n  \n  \n    \n  \n'

dirs=(
  "projects/homelab"
  "projects/homelab/cleavenas"
  "projects/homelab/pihole"
  "projects/homelab/guerilla-education"
  "projects/it-support"
  "projects/makerspace"
  "projects/projection-art"
  "projects/motion-design"
  "projects/lighting-design"
  "projects/lighting-design/concert-stage"
  "projects/lighting-design/immersive"
  "projects/disk-jockey"
  "projects/production"
  "projects/radio"
)

for dir in "${dirs[@]}"; do
  mkdir -p "$dir"
  echo -e "$STUB" > "$dir/index.html"
  echo "Created $dir/index.html"
done

echo ""
echo "Done! All project folders created."