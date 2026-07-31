import { registerPlugin } from "@capacitor/core";

export type SecureSessionPlugin = {
  save(options: { value: string }): Promise<void>;
  load(): Promise<{ value?: string }>;
  clear(): Promise<void>;
  saveSocialAuth(options: { value: string }): Promise<void>;
  loadSocialAuth(): Promise<{ value?: string }>;
  clearSocialAuth(): Promise<void>;
};

export const SecureSession =
  registerPlugin<SecureSessionPlugin>("SecureSession");
