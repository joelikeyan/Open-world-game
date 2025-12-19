$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $root '..')
$python = if ($env:PYTHON) { $env:PYTHON } else { 'python' }

$script = @'
from engine.streaming import ChunkKey
from data_ingest.open_maps.pipeline import DataIngestPipeline, RegionRequest
from procedural.buildings import LODPolicy
from controls.input_profiles import (
    InputEvent,
    MouseKeyboardProfile,
    StreamingTraversalController,
    XboxControllerProfile,
)

pipeline = DataIngestPipeline()
request = RegionRequest(
    name="demo_region",
    chunk_keys=[
        ChunkKey(latitude=0, longitude=0, level_of_detail=0),
        ChunkKey(latitude=0, longitude=1, level_of_detail=0),
    ],
    zoning_policy="mixed_use",
    lod_policy=LODPolicy.HALO_INFINITE_ULTRA_HD,
)
report = pipeline.run(request)

service = pipeline.streaming_service
controller = StreamingTraversalController(service, request.chunk_keys[0])
xbox = XboxControllerProfile()
keyboard = MouseKeyboardProfile()

controller.apply_event(xbox, InputEvent("xbox", "left_stick_right"))
controller.apply_event(keyboard, InputEvent("keyboard", "w"))

print(f"Packaged {len(report['chunks'])} chunks for region {request.name}.")
'@

$pythonArgs = @('-c', $script)
& $python @pythonArgs

$packageDir = Join-Path $projectRoot 'artifacts/packages'
if (Test-Path $packageDir) {
    Write-Host "Packages available in $packageDir:" -ForegroundColor Cyan
    Get-ChildItem $packageDir | ForEach-Object { $_.Name }
}
