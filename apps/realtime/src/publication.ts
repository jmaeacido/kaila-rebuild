import { realtimePublicationSchema } from "@kaila/contracts";

export const parseRealtimePublication = (message: string) => {
  try {
    const result = realtimePublicationSchema.safeParse(JSON.parse(message));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
