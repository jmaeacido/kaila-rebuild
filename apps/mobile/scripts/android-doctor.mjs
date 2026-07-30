import { existsSync } from "node:fs";
import { arch, platform } from "node:process";
import { join } from "node:path";

const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const javaHome = process.env.JAVA_HOME;
const failures = [];
const warnings = [];

if (!javaHome || !existsSync(join(javaHome, "bin", platform === "win32" ? "java.exe" : "java"))) {
  failures.push("JAVA_HOME must point to a JDK installation.");
}

if (!sdkRoot) {
  failures.push("Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK.");
} else {
  const requiredSdkPaths = [
    join(sdkRoot, "platforms", "android-36"),
    join(sdkRoot, "build-tools", "36.0.0"),
    join(sdkRoot, "platform-tools"),
  ];
  for (const requiredPath of requiredSdkPaths) {
    if (!existsSync(requiredPath)) failures.push(`Android SDK component is missing: ${requiredPath}`);
  }
}

if (platform === "linux" && arch === "arm64") {
  warnings.push("This ARM64 Linux host can sync the project, but Google's x86-64 AAPT2 may prevent APK/AAB compilation.");
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`Error: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Android toolchain is configured for ${platform} ${arch}.`);
}
