import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  title: string;
};

export const Card = ({ children, className = "", title, ...props }: CardProps) => (
  <section {...props} className={`kaila-card ${className}`.trim()}>
    <h2 className="kaila-card__title">{title}</h2>
    {children}
  </section>
);
