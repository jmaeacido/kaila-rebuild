import { SUPPORT_EMAIL } from "../../lib/support-email";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  href?: { label: string; path: string };
};

export type FaqGroup = {
  id: string;
  title: string;
  items: FaqItem[];
};

export const faqGroups: FaqGroup[] = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        id: "what-is-kaila",
        question: "What is KAILA?",
        answer:
          "KAILA is a local services marketplace. Clients post what they need, nearby independent providers send offers, and both sides manage the job — messages, travel, work, and ratings — in one place.",
      },
      {
        id: "client-or-provider",
        question: "Can I use KAILA as a client and a provider?",
        answer:
          "Yes. One account can switch between client and provider mode after you set up a provider profile. Your jobs, messages, and ratings stay attached to the same account.",
        href: { label: "Open account", path: "/account" },
      },
      {
        id: "google-sign-in",
        question: "Can I sign in with Google?",
        answer:
          "Yes. You can create an account or sign in with Google. Google accounts confirm identity with your email when deleting an account, because KAILA does not store a password for that sign-in method.",
        href: { label: "Sign in", path: "/login" },
      },
    ],
  },
  {
    id: "clients",
    title: "For clients",
    items: [
      {
        id: "post-job",
        question: "How do I post a job?",
        answer:
          "From Home, tap Post a job, choose a service, describe the work, and pin the job site on the map. KAILA uses that pin to set the barangay for matching nearby providers.",
        href: { label: "Post a job", path: "/post-job" },
      },
      {
        id: "offers",
        question: "How do offers work?",
        answer:
          "Matched providers can send offers with price, timing, and scope. Compare those details on the job, then accept the offer that fits you. KAILA never chooses a provider or sets a price for you.",
        href: { label: "View your jobs", path: "/jobs" },
      },
      {
        id: "home-area",
        question: "What is my home area?",
        answer:
          "Your home area is the barangay you set in Account. It helps personalize local guidance. If your phone location is in a different city or municipality, KAILA shows a reminder so you can update it.",
        href: { label: "Update home area", path: "/account" },
      },
      {
        id: "payments",
        question: "Does KAILA take payments?",
        answer:
          "KAILA helps you hire and coordinate local work. Payment arrangements stay between you and the provider unless a future release says otherwise. Agree on price in the offer before work starts.",
      },
    ],
  },
  {
    id: "providers",
    title: "For providers",
    items: [
      {
        id: "become-provider",
        question: "How do I start taking jobs?",
        answer:
          "Open your provider profile, add the services you offer, set your coverage area, and complete required profile details. When you are eligible and in provider mode, nearby matching jobs appear under Work.",
        href: { label: "Provider profile", path: "/provider-profile" },
      },
      {
        id: "coverage",
        question: "How does coverage area affect matches?",
        answer:
          "KAILA matches jobs whose barangay falls inside the cities, municipalities, or barangays you cover. Keep coverage accurate so you only see work you can reach.",
        href: { label: "Update coverage", path: "/provider-profile" },
      },
      {
        id: "travel",
        question: "What happens after I am hired?",
        answer:
          "You can message the client, start travel navigation when heading to the job, mark arrival, complete the work, and submit completion. The client confirms, then both sides can rate.",
      },
    ],
  },
  {
    id: "trust-safety",
    title: "Trust and safety",
    items: [
      {
        id: "safety",
        question: "How do I report a safety problem?",
        answer:
          "Use Safety to report scams, threats, or unsafe conduct. For immediate danger, contact local emergency services first, then report in KAILA so the team can review.",
        href: { label: "Open Safety", path: "/safety" },
      },
      {
        id: "ratings",
        question: "When do ratings appear?",
        answer:
          "After a job is completed, both sides can leave a rating. Published ratings help the community choose trustworthy local help.",
      },
      {
        id: "delete-account",
        question: "How do I delete my account?",
        answer:
          "Go to Settings → Delete account. Finish any active jobs, disputes, or safety cases first. Password accounts confirm with their password; Google accounts confirm by typing their email, then typing DELETE.",
        href: { label: "Account deletion", path: "/account-deletion" },
      },
    ],
  },
  {
    id: "app-help",
    title: "Using the app",
    items: [
      {
        id: "katabang",
        question: "What is Katabang?",
        answer:
          "Katabang is KAILA’s in-app assistant. It can guide you to the right screen, but it never chooses providers, sets prices, or changes your account for you.",
      },
      {
        id: "notifications",
        question: "How do notifications work?",
        answer:
          "KAILA can send in-app and push updates for offers, messages, calls, and job changes. Manage quiet hours and notification preferences in Settings.",
        href: { label: "Open Settings", path: "/settings" },
      },
      {
        id: "support",
        question: "How do I contact support?",
        answer:
          `Open Support to start a request about your account, booking, or app experience and follow replies in the same thread. You can also email ${SUPPORT_EMAIL} when you cannot stay signed in.`,
        href: { label: "Contact support", path: "/support" },
      },
    ],
  },
];
