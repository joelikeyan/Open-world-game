"""Open data ingestion pipeline for preparing engine-ready meshes."""
from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

from engine.streaming import ChunkCache, ChunkKey, ChunkStreamingService
from procedural.buildings import BuildingExtruder, LODPolicy


@dataclass(frozen=True)
class RegionRequest:
    """Defines which region to ingest and which chunk keys to populate."""

    name: str
    chunk_keys: Sequence[ChunkKey]
    zoning_policy: str = "mixed_use"
    lod_policy: LODPolicy = LODPolicy.MEDIUM


class DataIngestPipeline:
    """End-to-end data pipeline that prepares data for the streaming engine."""

    def __init__(
        self,
        cache_dir: Path | str = Path("artifacts/chunks"),
        extruder: BuildingExtruder | None = None,
        streaming_service: ChunkStreamingService | None = None,
    ) -> None:
        self.cache = ChunkCache(cache_dir)
        self.streaming_service = streaming_service or ChunkStreamingService(cache=self.cache)
        self.extruder = extruder or BuildingExtruder()

    def run(self, request: RegionRequest) -> Dict[str, List[dict]]:
        """Execute the pipeline for the provided region request."""

        datasets = self._download_datasets(request)
        meshes = self._normalize_to_meshes(datasets, request)
        return self._populate_chunks(meshes, request)

    def _download_datasets(self, request: RegionRequest) -> List[dict]:
        """Fetch datasets for the region. Uses deterministic synthetic data for tests."""

        dataset_specs = [
            {
                "name": "openstreetmap_roads",
                "type": "transport",
                "license": "ODbL",
            },
            {
                "name": "open_buildings",
                "type": "structures",
                "license": "CC-BY",
            },
        ]
        datasets: List[dict] = []
        for spec in dataset_specs:
            rng = random.Random(hash((spec["name"], request.name)))
            records = []
            for idx in range(3):
                records.append(
                    {
                        "id": f"{spec['name']}-{idx}",
                        "footprint": [
                            (round(rng.uniform(-0.5, 0.5), 3), round(rng.uniform(-0.5, 0.5), 3))
                            for _ in range(4)
                        ],
                        "zoning": request.zoning_policy,
                    }
                )
            datasets.append({"spec": spec, "records": records})
        return datasets

    def _normalize_to_meshes(self, datasets: Iterable[dict], request: RegionRequest) -> List[dict]:
        meshes: List[dict] = []
        for dataset in datasets:
            for record in dataset["records"]:
                mesh = self.extruder.extrude(
                    footprint=record["footprint"],
                    zoning=record["zoning"],
                    policy=request.lod_policy,
                )
                mesh.update(
                    {
                        "dataset": dataset["spec"]["name"],
                        "source_license": dataset["spec"]["license"],
                        "record_id": record["id"],
                    }
                )
                meshes.append(mesh)
        return meshes

    def _populate_chunks(self, meshes: List[dict], request: RegionRequest) -> Dict[str, List[dict]]:
        results: Dict[str, List[dict]] = {"chunks": []}
        for key in request.chunk_keys:
            chunk = self.streaming_service.request_chunk(key)
            chunk.payload.setdefault("meshes", [])
            chunk.payload["meshes"].extend(meshes)
            self.cache.store(chunk)
            results["chunks"].append(
                {
                    "key": {
                        "latitude": key.latitude,
                        "longitude": key.longitude,
                        "lod": key.level_of_detail,
                    },
                    "mesh_count": len(chunk.payload["meshes"]),
                }
            )
        self._package_region(results, request)
        return results

    def _package_region(self, results: Dict[str, List[dict]], request: RegionRequest) -> None:
        package_dir = Path("artifacts/packages")
        package_dir.mkdir(parents=True, exist_ok=True)
        package_path = package_dir / f"{request.name}_package.json"
        with package_path.open("w", encoding="utf-8") as handle:
            json.dump(results, handle, indent=2)


__all__ = ["DataIngestPipeline", "RegionRequest"]
