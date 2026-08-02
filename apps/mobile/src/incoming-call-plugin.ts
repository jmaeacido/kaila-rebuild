import { registerPlugin } from "@capacitor/core";

type IncomingCallPlugin = {
  startActiveCall(options: { media: "audio" | "video" }): Promise<void>;
  stopActiveCall(): Promise<void>;
  cancelIncoming(): Promise<void>;
};

export const IncomingCall = registerPlugin<IncomingCallPlugin>("IncomingCall");
