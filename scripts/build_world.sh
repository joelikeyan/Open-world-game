#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-python3}"

REGION_NAME="demo_region"

${PYTHON} - <<'PY'
from engine.streaming import ChunkKey
from data_ingest.open_maps.pipeline import DataIngestPipeline, RegionRequest
from procedural.buildings import LODPolicy
from controls.input_profiles import (
    InputEvent,
    MouseKeyboardProfile,
    StreamingTraversalController,
    XboxControllerProfile,
)

pipeline = DataIngestPipeline()
request = RegionRequest(
    name="demo_region",
    chunk_keys=[
        ChunkKey(latitude=0, longitude=0, level_of_detail=0),
        ChunkKey(latitude=0, longitude=1, level_of_detail=0),
    ],
    zoning_policy="mixed_use",
    lod_policy=LODPolicy.HALO_INFINITE_ULTRA_HD,
)
report = pipeline.run(request)

service = pipeline.streaming_service
controller = StreamingTraversalController(service, request.chunk_keys[0])
xbox = XboxControllerProfile()
keyboard = MouseKeyboardProfile()

controller.apply_event(xbox, InputEvent("xbox", "left_stick_right"))
controller.apply_event(keyboard, InputEvent("keyboard", "w"))

print(f"Packaged {len(report['chunks'])} chunks for region {request.name}.")
PY

PACKAGE_DIR="${ROOT_DIR}/artifacts/packages"
if [ -d "${PACKAGE_DIR}" ]; then
  echo "Packages available in ${PACKAGE_DIR}:"
  ls -1 "${PACKAGE_DIR}"
fi
