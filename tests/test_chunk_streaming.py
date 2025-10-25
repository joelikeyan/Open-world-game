from engine.streaming import ChunkKey, ChunkLifecycleError, ChunkStreamingService


def test_request_chunk_is_deterministic(tmp_path):
    service = ChunkStreamingService()
    key = ChunkKey(latitude=10, longitude=20, level_of_detail=2)

    chunk_a = service.request_chunk(key)
    chunk_b = service.request_chunk(key)

    assert chunk_a.payload == chunk_b.payload
    assert chunk_a.metadata == chunk_b.metadata
    assert chunk_a.state.value == "loaded"


def test_chunk_unload_clears_payload(tmp_path):
    service = ChunkStreamingService()
    key = ChunkKey(latitude=1, longitude=2, level_of_detail=0)

    chunk = service.request_chunk(key)
    assert chunk.payload["features"]

    service.unload_chunk(key)
    assert chunk.payload == {}
    assert chunk.state.value == "unloaded"


def test_unload_missing_chunk_raises():
    service = ChunkStreamingService()
    key = ChunkKey(latitude=0, longitude=0, level_of_detail=0)

    try:
        service.unload_chunk(key)
    except ChunkLifecycleError:
        pass
    else:
        raise AssertionError("Expected ChunkLifecycleError for missing chunk")
