import { CheckCircle2, Circle } from "lucide-react";
import styles from "./auth.module.css";

type PasswordRequirementsProps = {
  password: string;
};

export function passwordMeetsRequirements(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = [
    {
      label: "Uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "Letters and numbers",
      met: /[A-Za-z]/.test(password) && /[0-9]/.test(password),
    },
  ];

  return (
    <ul
      aria-label="Password requirements"
      aria-live="polite"
      className={styles.passwordRequirements}
    >
      {requirements.map((requirement) => (
        <li data-met={requirement.met} key={requirement.label}>
          {requirement.met ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <Circle aria-hidden="true" />
          )}
          <span className={styles.requirementStatus}>
            {requirement.met ? "Met" : "Not met"}:
          </span>
          {requirement.label}
        </li>
      ))}
    </ul>
  );
}
