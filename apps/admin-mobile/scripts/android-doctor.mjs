import { existsSync } from "node:fs";
import { arch, platform } from "node:process";
import { join } from "node:path";

const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const javaHome = process.env.JAVA_HOME;
const failures = [];

if (!javaHome || !existsSync(join(javaHome, "bin", platform === "win32" ? "java.exe" : "java"))) {
  failures.push("JAVA_HOME must point to a JDK installation.");
}

if (!sdkRoot) {
  failures.push("Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK.");
} else {
  for (const path of [
    join(sdkRoot, "platforms", "android-36"),
    join(sdkRoot, "build-tools", "36.0.0"),
    join(sdkRoot, "platform-tools"),
  ]) {
    if (!existsSync(path)) failures.push(`Android SDK component is missing: ${path}`);
  }
}

if (platform === "linux" && arch === "arm64") {
  console.warn("Warning: this ARM64 host may not be able to execute Google's x86-64 AAPT2 binary.");
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`Error: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Android toolchain is configured for ${platform} ${arch}.`);
}
