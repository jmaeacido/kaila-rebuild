import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
};

export const Button = ({
  children,
  className = "",
  disabled,
  isLoading = false,
  variant = "primary",
  ...props
}: ButtonProps) => (
  <button
    {...props}
    aria-busy={isLoading || undefined}
    className={`kaila-button kaila-button--${variant} ${className}`.trim()}
    disabled={disabled || isLoading}
  >
    {isLoading && <span aria-hidden="true" className="kaila-spinner" />}
    <span>{children}</span>
  </button>
);
