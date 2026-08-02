import { z } from "zod";

export const realtimeEventEnvelopeSchema = z.object({
  eventId: z.uuid(),
  type: z.string().min(1),
  occurredAt: z.iso.datetime({ offset: true }),
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  version: z.int().nonnegative(),
  data: z.record(z.string(), z.unknown()),
});

export type RealtimeEventEnvelope = z.infer<
  typeof realtimeEventEnvelopeSchema
>;

export const marketplaceRealtimeEventTypeSchema = z.enum([
  "job.posted",
  "job.updated",
  "job.draft_updated",
  "job.media.updated",
  "job.state.changed",
  "opportunity.matched",
  "opportunity.updated",
  "offer.created",
  "offer.revised",
  "offer.selected",
  "offer.rejected",
  "offer.withdrawn",
  "message.created",
  "message.read",
  "message.reacted",
  "message.asset.updated",
  "conversation.typing.changed",
  "travel.started",
  "travel.location.changed",
  "travel.arrival.changed",
  "travel.stopped",
  "notification.created",
  "notification.read",
  "notification.read_all",
  "direct.conversation.requested",
  "direct.conversation.accepted",
  "direct.message.created",
  "community.post.published",
  "community.post.updated",
  "profile.updated",
  "profile.media.updated",
  "call.ringing",
  "call.status.changed",
  "support.case.created",
  "support.message.created",
  "support.case.updated",
  "support.case.open",
  "support.case.waiting_for_support",
  "support.case.waiting_for_customer",
  "support.case.resolved",
  "support.case.closed",
]);

export const typingCommandSchema = z.object({ jobId: z.uuid(), active: z.boolean() });
export const travelLocationCommandSchema = z.object({ jobId: z.uuid(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracyMeters: z.number().int().positive().max(200), capturedAt: z.iso.datetime({ offset: true }), foreground: z.literal(true) });

export const realtimePublicationSchema = z.object({
  event: realtimeEventEnvelopeSchema,
  recipientUserIds: z.array(z.string().min(1)).min(1).max(100),
});

export type RealtimePublication = z.infer<typeof realtimePublicationSchema>;

export const connectionTicketClaimsSchema = z.object({
  sub: z.string().min(1),
  sessionId: z.string().min(1),
  aud: z.literal("kaila-realtime"),
  iss: z.literal("kaila-api"),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  jti: z.string().min(1),
});

export type ConnectionTicketClaims = z.infer<
  typeof connectionTicketClaimsSchema
>;
