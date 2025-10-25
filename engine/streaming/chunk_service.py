"""Chunk streaming services responsible for deterministic paging."""
from __future__ import annotations

import random
from typing import Dict, Iterable, List, Optional

from .chunk import Chunk, ChunkKey, ChunkState


class ChunkLifecycleError(RuntimeError):
    """Raised when lifecycle operations are performed on invalid chunks."""


class ChunkStreamingService:
    """Pages geographic chunks using deterministic seeds."""

    def __init__(self, cache: Optional[object] = None, deterministic: bool = True) -> None:
        self._cache = cache
        self._deterministic = deterministic
        self._chunks: Dict[ChunkKey, Chunk] = {}

    def request_chunk(self, key: ChunkKey) -> Chunk:
        """Load a chunk, generating deterministic payload if necessary."""

        chunk = self._chunks.get(key)
        if chunk and chunk.state == ChunkState.LOADED:
            return chunk

        chunk = Chunk(key=key)
        seed = key.seed() if self._deterministic else None
        generator = random.Random(seed)
        features = self._generate_features(generator)
        chunk.payload = {
            "features": features,
            "seed": seed,
        }
        chunk.metadata = {
            "elevation": round(generator.uniform(0.0, 1250.0), 3),
            "temperature": round(generator.uniform(-10.0, 35.0), 2),
        }
        chunk.mark_loaded()
        self._chunks[key] = chunk

        if self._cache is not None:
            self._write_to_cache(chunk)

        return chunk

    def request_many(self, keys: Iterable[ChunkKey]) -> List[Chunk]:
        """Batch load helper used by higher-level systems."""

        return [self.request_chunk(key) for key in keys]

    def unload_chunk(self, key: ChunkKey) -> Chunk:
        """Transition a chunk into the unloaded state and evict its payload."""

        chunk = self._chunks.get(key)
        if chunk is None:
            raise ChunkLifecycleError(f"Chunk {key} is not loaded")

        chunk.mark_unloaded()
        if hasattr(self._cache, "evict"):
            self._cache.evict(key)
        return chunk

    def get_loaded_chunks(self) -> Dict[ChunkKey, Chunk]:
        """Return a copy of the loaded chunk map for inspection/testing."""

        return dict(self._chunks)

    def _write_to_cache(self, chunk: Chunk) -> None:
        if hasattr(self._cache, "store"):
            self._cache.store(chunk)
        else:
            self._cache[chunk.key] = chunk.payload

    @staticmethod
    def _generate_features(generator: random.Random) -> List[dict]:
        """Generate synthetic feature data using a deterministic RNG."""

        biome_options = ["tundra", "temperate", "desert", "forest", "alpine"]
        features: List[dict] = []
        for feature_id in range(5):
            features.append(
                {
                    "id": feature_id,
                    "biome": generator.choice(biome_options),
                    "resource_density": round(generator.random(), 4),
                }
            )
        return features


__all__ = ["ChunkStreamingService", "ChunkLifecycleError"]
