export type CallMedia = "audio" | "video";

export type CallSignal = {
  type: "ringing" | "offer" | "answer" | "candidate" | "hangup";
  callId: string;
  media: CallMedia;
  callerUserId?: number;
  callerName?: string;
  contextType?: string;
  contextId?: string;
  description?: RTCSessionDescriptionInit | null;
  candidate?: RTCIceCandidateInit | null;
};

export type ActiveCall = {
  id: string;
  media: CallMedia;
  direction: "incoming" | "outgoing";
  status: "ringing" | "connecting" | "active";
  contextType: string;
  contextId: string;
  peerName: string;
  peerAvatarUrl: string | null;
};

export type StartCallInput = {
  contextType: "job" | "direct";
  contextId: string;
  media: CallMedia;
  peerName?: string;
  peerAvatarUrl?: string | null;
};
