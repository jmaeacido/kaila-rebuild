import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../legal-page";
import { publicPageMetadata } from "../seo";
import { PRIVACY_EMAIL } from "../../lib/privacy-email";
import { SUPPORT_EMAIL } from "../../lib/support-email";

export const metadata: Metadata = publicPageMetadata({
  title: "Privacy Policy",
  description: "How KAILA collects, uses, shares, and retains information.",
  path: "/privacy",
});

const sections: LegalSection[] = [
  {
    heading: "Who operates KAILA",
    body: `The Personal Information Controller (PIC) is John Mark Agustin Estrosos Acido, an individual operating the KAILA platform in the Philippines. KAILA is not yet a separately registered company or corporation. The same individual also acts as Data Protection Officer (DPO) / privacy lead. This is a one-person operation; privacy, security, and product decisions are self-reviews unless an independent advisor is later retained.`,
  },
  {
    heading: "Privacy and DPO contact",
    body: `Email the DPO at ${PRIVACY_EMAIL}. You may also open an in-app Support request at /support/new or email ${SUPPORT_EMAIL}. For account deletion use /account-deletion.`,
  },
  {
    heading: "What We Collect",
    body: `KAILA may collect: account identity and contact details (name, email, phone); profile information and photos; provider credentials and portfolio media; job requests, offers, reviews, and ratings; private messages and call signaling records; support cases and reports; device push tokens and operational logs; validation survey or interview entries when you choose to participate; precise and live location when you pin a job site or share navigation during an active travel session; and, when you consent, government-issued ID images and a live selfie for identity verification.`,
  },
  {
    heading: "Purposes and lawful bases",
    body: `We process personal data to operate the local-services marketplace (matching, offers, jobs, messaging, calls, notifications), protect users and investigate abuse, provide support and dispute handling, measure pilot performance, and meet legal obligations. Account and marketplace processing is based on contract performance and legitimate interests balanced against your rights. Marketing is not sold. Identity verification and sensitive ID data rely on your separate, specific consent. Precise location for navigation relies on your in-context consent and is limited to the travel session.`,
  },
  {
    heading: "Identity verification",
    body: `Before you post a first job or activate provider mode, KAILA may require identity verification. With your separate consent we collect photos of an accepted Philippine government-issued ID and a new selfie. Trained KAILA personnel compare them using KAILA-controlled systems. We do not use automated facial recognition or create facial templates in the initial release. Other users see only an “Identity verified” status — never your ID, selfie, ID number, birth date, or address. Verification is not a background check, character reference, or guarantee of safety or honesty. Raw ID and selfie images are retained only for the short periods in our identity-verification notice (generally deleted within days to weeks after a decision) unless an appeal, investigation, claim, or legal hold applies. Minimized consent, decision, and audit records are kept for accountability.`,
  },
  {
    heading: "Precise and live location",
    body: `Users may pin a job site or share device location to estimate distance and show navigation. Before hiring, matched providers can see the job’s area and a neighborhood-level rounded location for distance estimates, but not the exact pin or landmark. On Android, live tracking runs only after the provider starts navigation and continues while KAILA is minimized or the screen is locked. Android shows a persistent navigation notification with a stop action. Tracking stops when the provider stops navigation or the job leaves the traveling stage. Location samples are purged on a short schedule except where a dispute or legal hold applies.`,
  },
  {
    heading: "Recipients and service providers",
    body: `Contact details and job-site details are shared with counterparties only when needed for accepted jobs, support, dispute, or safety review. Infrastructure providers host application, database, object storage, email delivery, maps/routing, and push notification services under our instructions. There is currently no external identity-verification processor. We do not sell personal data.`,
  },
  {
    heading: "Cross-border processing",
    body: `Primary operations are intended for the Philippines. Some infrastructure or email providers may process data in other countries. Where that occurs, we rely on contractual and technical safeguards appropriate to the service. Identity evidence is stored on KAILA-controlled private storage configured for this deployment; production region and key-custody details are maintained by the operator and must be updated when a dedicated production evidence repository is commissioned.`,
  },
  {
    heading: "Retention and deletion",
    body: `Account deletion removes login access and anonymizes profile and contact details where feasible. Job, rating, report, message, consent, decision, and audit history may be retained where needed for safety, dispute, legal, or operational records, normally for the life of the account plus up to two years after closure unless a longer legal hold applies. Identity raw evidence follows the shorter schedule in the identity-verification notice. Location samples follow the travel retention schedule.`,
  },
  {
    heading: "Your rights",
    body: `Subject to the Data Privacy Act of 2012 and its rules, you may request access, correction, objection or withdrawal of consent, blocking or erasure, and portability where applicable. Use Support (/support/new), ${PRIVACY_EMAIL}, or /account-deletion. Withdrawal of identity consent stops further consent-based identity processing and may remove verification-dependent features. We will not require another reusable copy of your ID unless necessary and proportionate to authenticate a sensitive request.`,
  },
  {
    heading: "Complaints",
    body: `Contact the DPO first at ${PRIVACY_EMAIL}. You may also complain to the Philippine National Privacy Commission (privacy.gov.ph) if you believe your data privacy rights were violated.`,
  },
  {
    heading: "Security and breach contact",
    body: `KAILA uses access controls, TLS in transit, private storage for sensitive uploads, malware scanning/quarantine for identity evidence, audit logging, and retention jobs. Administrative multi-factor authentication for reviewers is a stated control that is not yet fully implemented in software. Report suspected personal-data breaches or reviewer misuse immediately to ${PRIVACY_EMAIL} or ${SUPPORT_EMAIL}.`,
  },
  {
    heading: "Messages, media, reports, and ratings",
    body: `Job messages and direct support messages may be reviewed by authorized staff for support, safety, dispute handling, and abuse prevention. Ratings are shown after both sides rate or the rating window closes.`,
  },
  {
    heading: "Validation research",
    body: `Client surveys and provider interviews are used for pilot planning, matching decisions, and product validation. Staff should avoid collecting unnecessary sensitive information and may use nicknames when a full name is not needed.`,
  },
  {
    heading: "Effective date and revisions",
    body: `This Privacy Policy is effective 11 September 2026 and replaces the 6 June 2026 pilot text. Material changes will be reflected here with a new effective date. Identity-verification consent binds to privacy policy version 2026-09-11 together with notice version identity-verification-1.0.`,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="KAILA privacy"
      title="Privacy Policy"
      updated="September 11, 2026"
      sections={sections}
    />
  );
}
