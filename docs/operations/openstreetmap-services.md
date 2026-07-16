# OpenStreetMap services runbook

## Runtime boundary

Nominatim and OSRM use a Philippines-only Geofabrik extract. Both services bind to loopback, are called only by Laravel, and must remain unavailable from the public internet. The browser loads attributed vector tiles from OpenFreeMap through MapLibre.

Production configuration:

```dotenv
MAPS_PROVIDER=openstreetmap
NOMINATIM_URL=http://127.0.0.1:8080
OSRM_URL=http://127.0.0.1:5000
MAPS_REQUEST_TIMEOUT_SECONDS=5
```

## Validation

After each dataset replacement, verify:

1. Nominatim resolves representative addresses in Metro Manila, Cebu, Davao, and provincial municipalities.
2. OSRM returns a route, distance, duration, and GeoJSON geometry for representative urban and inter-city coordinates.
3. Neither service port is reachable externally.
4. Laravel provider tests and a hired-job travel smoke test pass.
5. Memory, disk, response latency, and error rates remain within the Phase 7 pilot objectives.

## Updates and rollback

Download and checksum the next Philippines extract into a separate dated directory. Build new Nominatim and OSRM datasets without replacing the active services. Validate the sample set, stop the old instances, start the new instances on the loopback ports, and retain the previous data until the observation window passes. Roll back by restoring the prior containers and data volumes. Never rebuild the only active dataset in place.

OpenFreeMap provides no SLA. If tile availability becomes unacceptable, self-host its compatible OpenMapTiles output or move to another MapLibre style provider without changing the Laravel location contract.
