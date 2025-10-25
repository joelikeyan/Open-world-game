# Open-world-game

## Merged World Topology

The project stitches Cincinnati's riverfront with Volgograd's embankments into a continuous **Cincy-Volgograd** sandbox. The `scenes/CincyVolgograd_Merge.json` file drives geography, unified river data, bridge metadata, loading volumes, and travel objectives for the shared space.

Streaming logic lives in `src/engine/streaming.py`, which aligns both cities' chunk grids, guarantees waterbody continuity, and procedurally generates Volgograd districts with Cincinnati's fidelity and LOD characteristics.

Ambient and narrative traversal hooks are provided by `src/events/traversal.py`, enabling bridge crossings to swap ambience and trigger story cues.

## Traversal & Fast-Travel Controls

1. Manual bridge crossings over **Friendship Arches** and **Unity Causeway** trigger ambient swaps and narrative callouts while keeping both banks loaded.
2. Completing the `OBJ_BRIDGE_GALA` objective unlocks contextual fast-travel points anchored to both bridgeheads for rapid Cincinnati ↔ Volgograd transfers.
3. River navigation through `OBJ_RIVER_RUN` maintains waterbody fidelity while enabling waterborne travel with the same LOD budget as the bridge corridors.
4. Exploration objectives synchronize environmental monitors across districts, ensuring the unified weather simulation remains seamless during long-distance traversal.
