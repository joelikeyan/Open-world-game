"""Procedural building extrusion utilities."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Iterable, List, Sequence, Tuple

Footprint = Sequence[Tuple[float, float]]


class LODPolicy(str, Enum):
    """Level of detail policies that drive mesh complexity."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    HALO_INFINITE_ULTRA_HD = "HaloInfinite_UltraHD"

    @property
    def height_multiplier(self) -> float:
        return {
            LODPolicy.LOW: 0.6,
            LODPolicy.MEDIUM: 1.0,
            LODPolicy.HIGH: 1.4,
            LODPolicy.HALO_INFINITE_ULTRA_HD: 2.0,
        }[self]

    @property
    def detail_layers(self) -> int:
        return {
            LODPolicy.LOW: 1,
            LODPolicy.MEDIUM: 2,
            LODPolicy.HIGH: 3,
            LODPolicy.HALO_INFINITE_ULTRA_HD: 5,
        }[self]


@dataclass
class FidelityHookRegistry:
    """Registers fidelity callbacks for named presets."""

    halo_ultra_hd_hook: Callable[[Footprint, str, float], dict] | None = None

    def resolve(self, policy: LODPolicy) -> Callable[[Footprint, str, float], dict] | None:
        if policy is LODPolicy.HALO_INFINITE_ULTRA_HD:
            return self.halo_ultra_hd_hook
        return None

    @staticmethod
    def default() -> "FidelityHookRegistry":
        def default_hook(footprint: Footprint, zoning: str, height: float) -> dict:
            perimeter = _perimeter(footprint)
            return {
                "decorations": int(perimeter * 10),
                "emissive_panels": True,
                "zoning": zoning,
                "height": height,
            }

        return FidelityHookRegistry(halo_ultra_hd_hook=default_hook)


class BuildingExtruder:
    """Extrudes building footprints into simple prism meshes."""

    ZONING_HEIGHTS = {
        "residential": 12.0,
        "commercial": 20.0,
        "industrial": 16.0,
        "mixed_use": 18.0,
    }

    def __init__(self, fidelity_registry: FidelityHookRegistry | None = None) -> None:
        self.registry = fidelity_registry or FidelityHookRegistry.default()

    def extrude(self, footprint: Footprint, zoning: str, policy: LODPolicy) -> dict:
        base_height = self.ZONING_HEIGHTS.get(zoning, 10.0)
        height = round(base_height * policy.height_multiplier, 3)
        mesh = {
            "zoning": zoning,
            "height": height,
            "footprint": list(footprint),
            "lod": policy.value,
            "detail_layers": policy.detail_layers,
            "facades": self._generate_facades(footprint, policy.detail_layers),
        }
        hook = self.registry.resolve(policy)
        if hook:
            mesh["fidelity"] = hook(footprint, zoning, height)
        return mesh

    @staticmethod
    def _generate_facades(footprint: Footprint, layers: int) -> List[dict]:
        edges = _edges(footprint)
        facades: List[dict] = []
        for idx, length in enumerate(edges):
            facades.append(
                {
                    "segment": idx,
                    "length": round(length, 3),
                    "window_bays": layers * max(1, int(length * 2)),
                }
            )
        return facades


def _edges(footprint: Footprint) -> Iterable[float]:
    for idx in range(len(footprint)):
        x1, y1 = footprint[idx]
        x2, y2 = footprint[(idx + 1) % len(footprint)]
        yield ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5


def _perimeter(footprint: Footprint) -> float:
    return sum(_edges(footprint))


__all__ = ["BuildingExtruder", "FidelityHookRegistry", "LODPolicy"]
