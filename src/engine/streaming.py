"""Streaming engine extensions for the merged Cincinnati-Volgograd world."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Sequence, Tuple


Vec3 = Tuple[float, float, float]


@dataclass
class ChunkGrid:
    """Represents a city's world streaming grid."""

    name: str
    tile_size: Vec3
    lod_bands: Dict[str, int]
    fidelity: Dict[str, float]
    chunks: List[Dict[str, object]] = field(default_factory=list)

    def add_chunk(self, chunk_id: str, origin: Vec3, lod: int) -> None:
        self.chunks.append({
            "id": chunk_id,
            "origin": origin,
            "lod": lod,
        })


@dataclass
class BridgeCorridor:
    """Represents the stitched tiles that form a playable bridge connection."""

    name: str
    tiles: List[Dict[str, object]]
    water_continuity: Dict[str, object]
    ambient_event: str


class UnifiedStreamingEngine:
    """Adds logic for Cincinnati/Volgograd world stitching."""

    def __init__(self) -> None:
        self.city_grids: Dict[str, ChunkGrid] = {}
        self.bridge_corridors: List[BridgeCorridor] = []
        self.waterways: Dict[str, Dict[str, object]] = {}

    def register_city(
        self,
        name: str,
        tile_size: Vec3,
        lod_bands: Dict[str, int],
        fidelity: Dict[str, float],
    ) -> ChunkGrid:
        grid = ChunkGrid(name=name, tile_size=tile_size, lod_bands=lod_bands, fidelity=fidelity)
        self.city_grids[name] = grid
        return grid

    def stitch_grids(self, cincinnati: str, volgograd: str) -> None:
        if cincinnati not in self.city_grids:
            raise ValueError("Cincinnati grid must be registered before stitching")
        if volgograd not in self.city_grids:
            raise ValueError("Volgograd grid must be registered before stitching")

        cin_grid = self.city_grids[cincinnati]
        vlg_grid = self.city_grids[volgograd]
        self._align_fidelity(cin_grid, vlg_grid)
        self._synchronize_lod(cin_grid, vlg_grid)

    def define_bridge_corridor(
        self,
        name: str,
        control_points: Sequence[Vec3],
        deck_width: float,
        lane_count: int,
        ambient_swap: str,
    ) -> BridgeCorridor:
        tiles = self._generate_corridor_tiles(control_points, deck_width, lane_count)
        water_continuity = {
            "source": "cincinnati_ohio",
            "target": "volgograd_volga",
            "blend": 0.5,
        }
        corridor = BridgeCorridor(
            name=name,
            tiles=tiles,
            water_continuity=water_continuity,
            ambient_event=ambient_swap,
        )
        self.bridge_corridors.append(corridor)
        return corridor

    def ensure_waterbody_continuity(self, unified_name: str, flow_vector: Vec3, lod_bias: float) -> None:
        self.waterways[unified_name] = {
            "flow": flow_vector,
            "lod_bias": lod_bias,
            "source_ids": ("cincinnati_ohio", "volgograd_volga"),
        }

    def generate_volgograd_districts(
        self,
        district_names: Iterable[str],
        base_offset: Vec3,
        cincinnati_reference: str = "Cincinnati",
        volgograd_name: str = "Volgograd",
    ) -> List[Dict[str, object]]:
        if cincinnati_reference not in self.city_grids:
            raise ValueError("Cincinnati grid must be registered before generating Volgograd districts")
        if volgograd_name not in self.city_grids:
            raise ValueError("Volgograd grid must be registered before generating Volgograd districts")

        reference_grid = self.city_grids[cincinnati_reference]
        volgograd_grid = self.city_grids[volgograd_name]
        volgograd_grid.fidelity = dict(reference_grid.fidelity)

        lod_map = self._build_lod_map(reference_grid)
        generated_chunks: List[Dict[str, object]] = []

        for index, district in enumerate(district_names):
            lod = lod_map[index % len(lod_map)]
            origin = (
                base_offset[0] + (index * volgograd_grid.tile_size[0]),
                base_offset[1],
                base_offset[2] - (index * volgograd_grid.tile_size[2] * 0.5),
            )
            chunk_id = f"VLG_{district.upper()}"
            volgograd_grid.add_chunk(chunk_id=chunk_id, origin=origin, lod=lod)
            generated_chunks.append({
                "district": district,
                "chunk_id": chunk_id,
                "lod": lod,
                "origin": origin,
            })

        return generated_chunks

    def _generate_corridor_tiles(
        self,
        control_points: Sequence[Vec3],
        deck_width: float,
        lane_count: int,
    ) -> List[Dict[str, object]]:
        tiles: List[Dict[str, object]] = []
        for index, point in enumerate(control_points):
            tiles.append({
                "tile_id": f"{index:03d}",
                "center": point,
                "lane_count": lane_count,
                "width": deck_width,
                "materials": {
                    "deck": "materials/bridge/deck_composite.mat",
                    "supports": "materials/bridge/support_steel.mat",
                },
            })
        return tiles

    def _align_fidelity(self, cin_grid: ChunkGrid, vlg_grid: ChunkGrid) -> None:
        vlg_grid.fidelity = {
            "terrain_error": cin_grid.fidelity.get("terrain_error", 0.01),
            "prop_density": cin_grid.fidelity.get("prop_density", 1.0),
            "lighting_variance": cin_grid.fidelity.get("lighting_variance", 0.15),
        }

    def _synchronize_lod(self, cin_grid: ChunkGrid, vlg_grid: ChunkGrid) -> None:
        vlg_grid.lod_bands = dict(cin_grid.lod_bands)

    def _build_lod_map(self, grid: ChunkGrid) -> List[int]:
        lods = sorted(set(grid.lod_bands.values()))
        return lods or [0]
