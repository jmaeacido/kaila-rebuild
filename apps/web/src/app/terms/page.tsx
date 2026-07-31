import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | KAILA",
  description: "The terms that govern use of the KAILA marketplace.",
};

const sections: LegalSection[] = [
  {
    heading: "Marketplace Role",
    body: "KAILA helps clients and providers find each other, compare offers, coordinate work, and keep job records. Providers are independent service providers, not KAILA employees.",
  },
  {
    heading: "User Responsibilities",
    body: "Use accurate information, communicate respectfully, honor accepted offers, avoid unsafe or illegal work, and do not use KAILA to harass, scam, spam, impersonate, or mislead others.",
  },
  {
    heading: "Jobs, Offers, And Completion",
    body: "Clients choose providers from submitted offers. Providers should state price, schedule, and scope clearly. Completion, revision, dispute, and rating flows must be used honestly.",
  },
  {
    heading: "Location, Navigation, And Contact",
    body: "Users should pin accurate job or provider locations only when they are authorized to share them. Navigation, route distance, calls, and messages are coordination tools; users remain responsible for safe travel, lawful conduct, and verifying final job details.",
  },
  {
    heading: "Safety And Moderation",
    body: "KAILA may review reports, block abusive behavior, restrict accounts, remove unsafe content, or preserve records needed to investigate disputes and protect users.",
  },
  {
    heading: "Ratings",
    body: "Ratings should describe real job experiences. False, abusive, or retaliatory reviews may be investigated by support.",
  },
  {
    heading: "Validation And Staff Use",
    body: "Staff and admins must record validation surveys, provider interviews, support notes, and moderation actions accurately. They must not use KAILA data for unrelated personal purposes.",
  },
  {
    heading: "Limitations",
    body: "The pilot is provided as-is and may change as KAILA validates local marketplace operations. KAILA is not responsible for independent provider workmanship, pricing, or offline conduct, but support will help document and triage disputes.",
  },
  {
    heading: "Account Changes",
    body: "KAILA may suspend or remove accounts that violate these terms. Users may request account deletion, subject to safety and operational record retention.",
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="KAILA pilot rules"
      title="Terms of Service"
      updated="June 6, 2026"
      sections={sections}
    />
  );
}
