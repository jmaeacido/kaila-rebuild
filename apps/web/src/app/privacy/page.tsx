import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | KAILA",
  description: "How KAILA collects, uses, shares, and retains information.",
};

const sections: LegalSection[] = [
  {
    heading: "What We Collect",
    body: "KAILA collects account details, role, contact preferences, service request information, provider profiles, offers, messages, call signaling records, uploaded media, ratings, reports, blocks, device push tokens, validation survey/interview entries, location pins, and operational logs needed to run the pilot marketplace.",
  },
  {
    heading: "How We Use Data",
    body: "We use data to match clients and providers, estimate route distance, support live job-site navigation, operate chat and calls, send notifications, support disputes, protect users, improve local service quality, and measure pilot performance.",
  },
  {
    heading: "Location And Navigation",
    body: "Users may pin a job site or share device location to estimate distance and show navigation. On Android, live tracking runs only after the provider starts navigation and continues while KAILA is minimized or the screen is locked. Android shows a persistent navigation notification with a stop action. Tracking stops when the provider stops navigation or the job leaves the traveling stage.",
  },
  {
    heading: "Sharing",
    body: "Contact details and job-site details are shared only when needed for accepted jobs, support handling, dispute review, or safety review. KAILA does not sell pilot user data.",
  },
  {
    heading: "Messages, Media, Reports, And Ratings",
    body: "Job messages and direct support messages may be reviewed by authorized staff for support, safety, dispute handling, and abuse prevention. Ratings are shown after both sides rate or the rating window closes.",
  },
  {
    heading: "Validation Research",
    body: "Client surveys and provider interviews are used for pilot planning, matching decisions, and product validation. Staff should avoid collecting unnecessary sensitive information and may use nicknames when a full name is not needed.",
  },
  {
    heading: "Your Choices",
    body: "You can update profile details, block users, report users or jobs, contact support, disable device notifications, and request account deletion.",
  },
  {
    heading: "Retention",
    body: "Account deletion removes login access and anonymizes profile/contact details. Job, rating, report, and message history may be retained where needed for safety, dispute, legal, or operational records.",
  },
  {
    heading: "Contact",
    body: "Use KAILA's official in-app support channel for privacy questions, account help, safety concerns, or an account-deletion request.",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="KAILA pilot policy"
      title="Privacy Policy"
      updated="June 6, 2026"
      sections={sections}
    />
  );
}
