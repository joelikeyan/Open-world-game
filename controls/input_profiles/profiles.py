"""Input profile mapping for streaming traversal."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

from engine.streaming import ChunkKey, ChunkStreamingService


@dataclass(frozen=True)
class InputEvent:
    device: str
    control: str
    value: float = 1.0


@dataclass
class InputProfile:
    name: str
    bindings: Dict[Tuple[str, str], str]

    def translate(self, event: InputEvent) -> str | None:
        return self.bindings.get((event.device, event.control))


class XboxControllerProfile(InputProfile):
    def __init__(self) -> None:
        bindings = {
            ("xbox", "left_stick_up"): "move_north",
            ("xbox", "left_stick_down"): "move_south",
            ("xbox", "left_stick_left"): "move_west",
            ("xbox", "left_stick_right"): "move_east",
            ("xbox", "a"): "interact",
            ("xbox", "b"): "cancel",
        }
        super().__init__(name="Xbox Controller", bindings=bindings)


class MouseKeyboardProfile(InputProfile):
    def __init__(self) -> None:
        bindings = {
            ("keyboard", "w"): "move_north",
            ("keyboard", "s"): "move_south",
            ("keyboard", "a"): "move_west",
            ("keyboard", "d"): "move_east",
            ("mouse", "left_click"): "interact",
            ("keyboard", "escape"): "cancel",
        }
        super().__init__(name="Mouse + Keyboard", bindings=bindings)


class StreamingTraversalController:
    """Maps input actions into streaming traversal updates."""

    def __init__(self, streaming_service: ChunkStreamingService, origin: ChunkKey) -> None:
        self.streaming_service = streaming_service
        self.current_key = origin

    def apply_event(self, profile: InputProfile, event: InputEvent) -> ChunkKey:
        action = profile.translate(event)
        if action is None:
            return self.current_key
        if action.startswith("move_"):
            self.current_key = self._shift(action)
            self.streaming_service.request_chunk(self.current_key)
        return self.current_key

    def _shift(self, action: str) -> ChunkKey:
        lat, lon, lod = (
            self.current_key.latitude,
            self.current_key.longitude,
            self.current_key.level_of_detail,
        )
        if action == "move_north":
            lat += 1
        elif action == "move_south":
            lat -= 1
        elif action == "move_east":
            lon += 1
        elif action == "move_west":
            lon -= 1
        return ChunkKey(latitude=lat, longitude=lon, level_of_detail=lod)


__all__ = [
    "InputEvent",
    "InputProfile",
    "MouseKeyboardProfile",
    "StreamingTraversalController",
    "XboxControllerProfile",
]
