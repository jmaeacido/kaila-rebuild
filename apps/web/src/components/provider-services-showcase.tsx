"use client";

import { Sparkles } from "lucide-react";
import { ServiceCategoryIcon } from "./service-category-icon";
import styles from "./provider-services-showcase.module.css";

export type ProviderServiceItem = {
  id: number;
  name: string;
  icon?: string | null;
  slug?: string | null;
};

type ProviderServicesShowcaseProps = {
  services: ProviderServiceItem[];
  variant?: "standalone" | "embedded";
};

export function ProviderServicesShowcase({
  services,
  variant = "standalone",
}: ProviderServicesShowcaseProps) {
  if (services.length === 0) {
    return null;
  }

  if (variant === "embedded") {
    return (
      <div className={styles.embedded} aria-labelledby="provider-services-heading">
        <div className={styles.embeddedHeader}>
          <Sparkles aria-hidden="true" />
          <h2 id="provider-services-heading">Services offered</h2>
        </div>
        <ul className={styles.embeddedGrid}>
          {services.map((service) => (
            <li key={service.id}>
              <article className={styles.embeddedCard}>
                <span className={styles.iconWrap} aria-hidden="true">
                  <ServiceCategoryIcon icon={service.icon || "Wrench"} />
                </span>
                <div className={styles.copy}>
                  <h3>{service.name}</h3>
                  <p>Available in your area</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="provider-services-heading">
      <div className={styles.header}>
        <Sparkles aria-hidden="true" />
        <div>
          <h2 id="provider-services-heading">Services offered</h2>
          <p>Book directly for any of these specialties</p>
        </div>
      </div>
      <ul className={styles.grid}>
        {services.map((service) => (
          <li key={service.id}>
            <article className={styles.card}>
              <span className={styles.iconWrap} aria-hidden="true">
                <ServiceCategoryIcon icon={service.icon || "Wrench"} />
              </span>
              <div className={styles.copy}>
                <h3>{service.name}</h3>
                <p>Available in your area</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
