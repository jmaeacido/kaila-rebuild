import type { ReactNode } from "react";

type FeedbackProps = {
  children: ReactNode;
  kind?: "info" | "success" | "warning" | "error";
  title: string;
};

export const Feedback = ({ children, kind = "info", title }: FeedbackProps) => (
  <section
    aria-live={kind === "error" ? "assertive" : "polite"}
    className={`kaila-feedback kaila-feedback--${kind}`}
    role={kind === "error" ? "alert" : "status"}
  >
    <h2 className="kaila-feedback__title">{title}</h2>
    <div>{children}</div>
  </section>
);

export const LoadingIndicator = ({ label = "Loading" }: { label?: string }) => (
  <div aria-label={label} className="kaila-loading" role="status">
    <span aria-hidden="true" className="kaila-spinner" />
    <span>{label}</span>
  </div>
);
