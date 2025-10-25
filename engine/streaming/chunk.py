"""Core chunk definitions for the open world streaming engine."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict


class ChunkState(str, Enum):
    """Lifecycle states for streamed geographic chunks."""

    REQUESTED = "requested"
    LOADED = "loaded"
    UNLOADED = "unloaded"


@dataclass(frozen=True)
class ChunkKey:
    """Uniquely identifies a chunk using integer tile coordinates and LOD."""

    latitude: int
    longitude: int
    level_of_detail: int

    def seed(self) -> int:
        """Generate a deterministic 32-bit seed based on the key."""

        # Mask to 32 bits so the seed is portable across platforms and runtimes.
        return hash((self.latitude, self.longitude, self.level_of_detail)) & 0xFFFFFFFF


@dataclass
class Chunk:
    """Runtime representation of a chunk and its simulation payload."""

    key: ChunkKey
    state: ChunkState = ChunkState.REQUESTED
    metadata: Dict[str, Any] = field(default_factory=dict)
    payload: Dict[str, Any] = field(default_factory=dict)

    def mark_loaded(self) -> None:
        """Mark the chunk as loaded."""

        self.state = ChunkState.LOADED

    def mark_unloaded(self) -> None:
        """Mark the chunk as unloaded and clear transient payload."""

        self.state = ChunkState.UNLOADED
        self.payload.clear()

