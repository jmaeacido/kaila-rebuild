export type IdentityGateReason = "post_job" | "activate_provider";

export function isIdentityVerificationBlock(message: string | null | undefined): boolean {
  if (!message) return false;
  return /verify your identity/i.test(message);
}

export function identityGateReasonFromMessage(message: string | null | undefined): IdentityGateReason {
  if (message && /provider|offer|work/i.test(message)) return "activate_provider";
  return "post_job";
}

export function identityGateCopy(reason: IdentityGateReason): { title: string; body: string } {
  if (reason === "post_job") {
    return {
      title: "Verify your identity to post your first job",
      body: "KAILA checks the identity of people who take part in jobs. This helps reduce impersonation and protects both clients and providers when they meet. You can keep browsing without verification, but you cannot post a job until it is complete.",
    };
  }

  return {
    title: "Verify your identity to become a provider",
    body: "Before you can send offers or take work, KAILA needs to check that you match a valid government-issued ID. You can keep using client features that do not require verification.",
  };
}
