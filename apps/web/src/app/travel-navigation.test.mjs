import assert from "node:assert/strict";
import test from "node:test";
import {
  activeNavigationStep,
  bearingDegrees,
  resolveTravelHeading,
  straightLineMeters,
} from "./travel-navigation.ts";

test("bearingDegrees points roughly east from a short eastward move", () => {
  const bearing = bearingDegrees(
    { latitude: 7.07, longitude: 125.6 },
    { latitude: 7.07, longitude: 125.601 },
  );
  assert.ok(bearing > 80 && bearing < 100);
});

test("resolveTravelHeading prefers GPS while moving and otherwise derives from travel", () => {
  assert.equal(
    resolveTravelHeading({
      gpsHeading: 45,
      speedMetersPerSecond: 3,
      previous: { latitude: 7.07, longitude: 125.6 },
      current: { latitude: 7.071, longitude: 125.6 },
    }),
    45,
  );
  const derived = resolveTravelHeading({
    gpsHeading: null,
    previous: { latitude: 7.07, longitude: 125.6 },
    current: { latitude: 7.071, longitude: 125.6 },
  });
  assert.ok(derived !== null && derived < 10);
  assert.equal(
    resolveTravelHeading({
      gpsHeading: null,
      previous: { latitude: 7.07, longitude: 125.6 },
      current: { latitude: 7.07001, longitude: 125.6 },
      minimumMoveMeters: 8,
    }),
    null,
  );
});

test("activeNavigationStep advances past nearby maneuvers", () => {
  const steps = [
    {
      instruction: "Head out",
      maneuver: "depart",
      modifier: null,
      distanceMeters: 40,
      durationSeconds: 20,
      location: { latitude: 7.07, longitude: 125.6 },
    },
    {
      instruction: "Turn right onto Main",
      maneuver: "turn",
      modifier: "right",
      distanceMeters: 120,
      durationSeconds: 40,
      location: { latitude: 7.0701, longitude: 125.6001 },
    },
    {
      instruction: "Arrive at the job site",
      maneuver: "arrive",
      modifier: null,
      distanceMeters: 0,
      durationSeconds: 0,
      location: { latitude: 7.08, longitude: 125.61 },
    },
  ];
  const nearFirstTurn = activeNavigationStep({ latitude: 7.0701, longitude: 125.6001 }, steps, 40);
  assert.equal(nearFirstTurn?.maneuver, "arrive");
  const beforeTurn = activeNavigationStep({ latitude: 7.069, longitude: 125.599 }, steps, 40);
  assert.equal(beforeTurn?.instruction, "Turn right onto Main");
  assert.ok((straightLineMeters({ latitude: 7.069, longitude: 125.599 }, steps[1].location) ?? 0) > 40);
});
