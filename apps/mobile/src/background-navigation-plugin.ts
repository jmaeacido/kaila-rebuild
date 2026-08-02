import { registerPlugin } from "@capacitor/core";

type BackgroundNavigationPlugin = {
  start(options: {
    locationUrl: string;
    stopUrl: string;
    accessToken: string;
    refreshUrl?: string;
    refreshToken?: string;
  }): Promise<void>;
  stop(): Promise<void>;
  status(): Promise<{ active: boolean; preciseLocation: boolean; locationEnabled: boolean }>;
};

export const BackgroundNavigation = registerPlugin<BackgroundNavigationPlugin>("BackgroundNavigation");
