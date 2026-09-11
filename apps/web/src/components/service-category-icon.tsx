import {
  Bike,
  BookOpen,
  Camera,
  Car,
  Cog,
  Drill,
  Droplets,
  Ellipsis,
  Flame,
  Hammer,
  Heart,
  House,
  MonitorCog,
  Smartphone,
  Snowflake,
  SprayCan,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { SewingMachine } from "./icons/sewing-machine";
import styles from "./service-category-icon.module.css";

const serviceCategoryIcons: Record<string, LucideIcon> = {
  Bike,
  BookOpen,
  Cleaning: SprayCan,
  Camera,
  Car,
  Cog,
  Drill,
  Droplets,
  Ellipsis,
  Flame,
  Hammer,
  Heart,
  House,
  MonitorCog,
  Scissors: SewingMachine,
  SewingMachine,
  Smartphone,
  Snowflake,
  Sparkles,
  Wrench,
  Zap,
};

const normalizedServiceCategoryIcons = Object.fromEntries(
  Object.entries(serviceCategoryIcons).map(([name, component]) => [
    name.replaceAll(/[^a-z0-9]/gi, "").toLowerCase(),
    component,
  ]),
);

export function ServiceCategoryIcon({
  icon,
  ...props
}: LucideProps & { icon: string }) {
  const normalizedIcon = icon.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
  const Icon = serviceCategoryIcons[icon] ?? normalizedServiceCategoryIcons[normalizedIcon] ?? Ellipsis;
  return <Icon {...props} />;
}

export function ServiceCategoryBadge({ icon, className }: { icon: string; className?: string }) {
  const normalizedIcon = icon.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
  const tone = Array.from(normalizedIcon).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % 6;

  return (
    <span className={`${styles.badge} ${styles[`tone${tone}`]}${className ? ` ${className}` : ""}`}>
      <ServiceCategoryIcon icon={icon} aria-hidden="true" />
    </span>
  );
}
