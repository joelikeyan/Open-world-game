"""Traversal events for Cincinnati-Volgograd bridge crossings."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from engine.streaming import BridgeCorridor


@dataclass
class BridgeEvent:
    """Defines the ambient and narrative payload for a bridge crossing."""

    ambient_event: str
    narrative_cue: str
    trigger_volume: Dict[str, float]


class TraversalEventManager:
    """Maintains traversal events that fire as the player crosses bridges."""

    def __init__(self) -> None:
        self._bridge_events: Dict[str, BridgeEvent] = {}

    def register_bridge_corridor(
        self,
        corridor: BridgeCorridor,
        narrative_cue: str,
        trigger_volume: Optional[Dict[str, float]] = None,
    ) -> None:
        volume = trigger_volume or {
            "length": len(corridor.tiles) * 10.0,
            "width": corridor.tiles[0]["width"] if corridor.tiles else 6.0,
            "height": 12.0,
        }
        self._bridge_events[corridor.name] = BridgeEvent(
            ambient_event=corridor.ambient_event,
            narrative_cue=narrative_cue,
            trigger_volume=volume,
        )

    def trigger_crossing(self, corridor_name: str) -> BridgeEvent:
        if corridor_name not in self._bridge_events:
            raise KeyError(f"Bridge corridor '{corridor_name}' is not registered")
        return self._bridge_events[corridor_name]

    def describe_event(self, corridor_name: str) -> Dict[str, str]:
        event = self.trigger_crossing(corridor_name)
        return {
            "ambient": event.ambient_event,
            "narrative": event.narrative_cue,
        }
