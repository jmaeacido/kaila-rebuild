import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { soundForNotification, UI_SOUNDS } from "./notification-sounds.ts";

const soundsDir = join(dirname(fileURLToPath(import.meta.url)), "../../public/sounds");
const androidRaw = join(dirname(fileURLToPath(import.meta.url)), "../../../mobile/android/app/src/main/res/raw");

const expected = [
  "kaila_job_match",
  "kaila_job_hired",
  "kaila_message",
  "kaila_message_sent",
  "kaila_offer",
  "kaila_counter_offer",
  "kaila_typing",
  "kaila_react",
  "kaila_job_update",
  "kaila_travel",
  "kaila_support",
  "kaila_call_ring",
  "kaila_call_ringback",
  "kaila_call_answered",
  "kaila_call_ended",
  "kaila_call_failed",
];

test("ships original KAILA sound assets for web and android", () => {
  for (const name of expected) {
    assert.equal(existsSync(join(soundsDir, `${name}.wav`)), true, `missing web ${name}`);
    assert.equal(existsSync(join(androidRaw, `${name}.wav`)), true, `missing android ${name}`);
  }
});

test("maps notification events to branded sound files", () => {
  assert.equal(soundForNotification("opportunity.matched"), "/sounds/kaila_job_match.wav");
  assert.equal(soundForNotification("offer.selected", "offer"), "/sounds/kaila_job_hired.wav");
  assert.equal(soundForNotification("message.created", "message"), "/sounds/kaila_message.wav");
  assert.equal(soundForNotification("offer.created", "offer"), "/sounds/kaila_offer.wav");
  assert.equal(soundForNotification("offer.revised", "offer"), "/sounds/kaila_counter_offer.wav");
  assert.equal(soundForNotification("job.state.changed", "job"), "/sounds/kaila_job_update.wav");
  assert.equal(soundForNotification("travel.arrival.changed", "travel"), "/sounds/kaila_travel.wav");
  assert.equal(soundForNotification("support.reply", "support"), "/sounds/kaila_support.wav");
  assert.equal(soundForNotification("call.ringing", "call"), "/sounds/kaila_call_ring.wav");
});

test("exposes in-app UI sound assets", () => {
  assert.equal(UI_SOUNDS.messageSent, "/sounds/kaila_message_sent.wav");
  assert.equal(UI_SOUNDS.callRingback, "/sounds/kaila_call_ringback.wav");
  assert.equal(UI_SOUNDS.callAnswered, "/sounds/kaila_call_answered.wav");
  assert.equal(UI_SOUNDS.callEnded, "/sounds/kaila_call_ended.wav");
  assert.equal(UI_SOUNDS.callFailed, "/sounds/kaila_call_failed.wav");
  assert.equal(UI_SOUNDS.typing, "/sounds/kaila_typing.wav");
  assert.equal(UI_SOUNDS.react, "/sounds/kaila_react.wav");
});
