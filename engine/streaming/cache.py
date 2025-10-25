"""Disk-backed cache helpers for chunk payloads."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .chunk import Chunk, ChunkKey


class ChunkCache:
    """Simple JSON cache that persists chunk payloads on disk."""

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def store(self, chunk: Chunk) -> None:
        path = self._path_for(chunk.key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(
                {
                    "key": {
                        "latitude": chunk.key.latitude,
                        "longitude": chunk.key.longitude,
                        "level_of_detail": chunk.key.level_of_detail,
                    },
                    "metadata": chunk.metadata,
                    "payload": chunk.payload,
                },
                handle,
                indent=2,
            )

    def load(self, key: ChunkKey) -> dict[str, Any]:
        path = self._path_for(key)
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def evict(self, key: ChunkKey) -> None:
        path = self._path_for(key)
        if path.exists():
            path.unlink()

    def _path_for(self, key: ChunkKey) -> Path:
        return self.root / f"lat_{key.latitude}" / f"lon_{key.longitude}" / f"lod_{key.level_of_detail}.json"


__all__ = ["ChunkCache"]
