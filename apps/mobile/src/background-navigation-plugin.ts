import { registerPlugin } from "@capacitor/core";

type BackgroundNavigationPlugin = {
  start(options: { locationUrl: string; stopUrl: string; accessToken: string }): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<{ active: boolean }>;
};

export const BackgroundNavigation = registerPlugin<BackgroundNavigationPlugin>("BackgroundNavigation");
