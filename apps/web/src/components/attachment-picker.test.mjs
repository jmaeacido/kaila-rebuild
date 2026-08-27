import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync(new URL("./attachment-picker.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./attachment-picker.module.css", import.meta.url), "utf8");
const conversation = readFileSync(new URL("../app/jobs/[jobId]/hired/conversation/page.tsx", import.meta.url), "utf8");
const androidCapture = readFileSync(
  new URL("../../../mobile/android/app/src/main/java/com/kaila/marketplace/MediaCapturePlugin.java", import.meta.url),
  "utf8",
);

test("attachment picker exposes camera, video, and library sources", () => {
  assert.match(picker, /Take photo/);
  assert.match(picker, /Record video/);
  assert.match(picker, /Choose files/);
  assert.match(picker, /capture=\{facingMode\}/);
  assert.match(picker, /captureNativeMedia\(kind\)/);
  assert.match(picker, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(picker, /<WebCameraCapture/);
  assert.match(picker, /context\.drawImage\(video/);
  assert.match(picker, /canvas\.toBlob\(resolve, "image\/jpeg"/);
  assert.match(picker, /accept="image\/\*"/);
  assert.match(picker, /accept="video\/\*"/);
  assert.match(styles, /\.actions/);
});

test("Android media capture requests camera permission before launching", () => {
  assert.match(androidCapture, /@Permission\(alias = "camera"/);
  assert.match(androidCapture, /requestPermissionForAlias\("camera", call, "cameraPermissionResult"\)/);
  assert.match(androidCapture, /getPermissionState\("camera"\) != PermissionState\.GRANTED/);
  assert.match(androidCapture, /launchCapture\(call\)/);
});

test("hired chat attach tray uses the shared camera sources", () => {
  assert.match(conversation, /AttachmentSourceActions/);
  assert.match(conversation, /kinds=\{\["image", "video", "pdf"\]\}/);
  assert.match(conversation, /showAttach/);
});
