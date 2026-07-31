import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalPageStyles, type LegalSection } from "../legal-page";

export const metadata: Metadata = {
  title: "Account and Data Deletion | KAILA",
  description: "How to request deletion of a KAILA account and personal data.",
};

const sections: LegalSection[] = [
  {
    heading: "How To Request Deletion",
    body: "Sign in to the KAILA account you want deleted and send an account-deletion request through KAILA's official in-app support channel. State that you want the account deleted. KAILA may ask you to verify control of the account before processing the request. Never send your password.",
  },
  {
    heading: "What Deletion Does",
    body: "Deletion removes login access and anonymizes profile and contact details. Device push tokens and other data that are no longer needed to operate or secure the account are removed.",
  },
  {
    heading: "Information That May Be Retained",
    body: "Job, message, rating, report, moderation, and dispute records may be retained where needed for safety, fraud prevention, dispute handling, legal obligations, or operational records. Retained records are separated from the deleted public profile where practical.",
  },
  {
    heading: "Before You Submit",
    body: "Resolve active jobs, offers, disputes, and outstanding safety matters when possible. Account deletion cannot be used to erase another person's job history or an active investigation.",
  },
];

export default function AccountDeletionPage() {
  return (
    <LegalPage
      eyebrow="KAILA account controls"
      title="Account and Data Deletion"
      updated="June 6, 2026"
      sections={sections}
    >
      <aside className={legalPageStyles.notice}>
        <strong>Self-service deletion is being restored.</strong>
        <p>
          Until the Settings control is available in the rebuilt application,
          submit the request through the official authenticated support channel.
        </p>
      </aside>
      <div className={legalPageStyles.actions}>
        <Link href="/login?next=%2Faccount">Sign in to KAILA</Link>
      </div>
    </LegalPage>
  );
}
