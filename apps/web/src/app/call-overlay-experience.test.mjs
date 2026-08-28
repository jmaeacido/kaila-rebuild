import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callOverlay = readFileSync(new URL("./calls/call-overlay.tsx", import.meta.url), "utf8");
const callProvider = readFileSync(new URL("./calls/call-provider.tsx", import.meta.url), "utf8");
const callOverlayStyles = readFileSync(new URL("./calls/call-overlay.module.css", import.meta.url), "utf8");

test("call overlay exposes mute, end, and camera controls for active video calls", () => {
  assert.match(callOverlay, /onToggleCamera/);
  assert.match(callOverlay, /cameraOff/);
  assert.match(callOverlay, /aria-label=\{call\.status === "active" \? "End call" : "Cancel call"\}/);
  assert.match(callOverlay, /call\.status === "active" && call\.media === "video"/);
});

test("call provider wires camera state into the overlay", () => {
  assert.match(callProvider, /cameraOff=\{cameraOff\}/);
  assert.match(callProvider, /onToggleCamera=\{toggleCamera\}/);
});

test("call overlay uses an immersive dark backdrop and ringing pulse", () => {
  assert.match(callOverlayStyles, /--color-call-backdrop/);
  assert.match(callOverlayStyles, /callRingPulse/);
  assert.match(callOverlay, /formatDuration/);
});
