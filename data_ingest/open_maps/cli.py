"""Command line helpers for the Open Maps pipeline."""
from __future__ import annotations

import argparse
from typing import List

from engine.streaming import ChunkKey

from .pipeline import DataIngestPipeline, RegionRequest
from procedural.buildings import LODPolicy


def parse_chunk_keys(raw_keys: List[str]) -> List[ChunkKey]:
    keys: List[ChunkKey] = []
    for raw in raw_keys:
        lat, lon, lod = map(int, raw.split(":"))
        keys.append(ChunkKey(latitude=lat, longitude=lon, level_of_detail=lod))
    return keys


def main(argv: List[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run the Open Maps data ingest pipeline.")
    parser.add_argument("name", help="Region name used for packaging")
    parser.add_argument(
        "--chunk",
        action="append",
        default=["0:0:0"],
        help="Chunk key in the form lat:lon:lod. Provide multiple times for more chunks.",
    )
    parser.add_argument(
        "--lod",
        default="medium",
        choices=[policy.value for policy in LODPolicy],
        help="Level of detail policy applied to procedural generation.",
    )
    parser.add_argument(
        "--zoning",
        default="mixed_use",
        help="Zoning policy tag propagated to extrusions.",
    )
    args = parser.parse_args(argv)

    request = RegionRequest(
        name=args.name,
        chunk_keys=parse_chunk_keys(args.chunk),
        zoning_policy=args.zoning,
        lod_policy=LODPolicy(args.lod),
    )
    pipeline = DataIngestPipeline()
    report = pipeline.run(request)
    print(f"Ingested {len(report['chunks'])} chunks for region {request.name}.")


if __name__ == "__main__":
    main()
