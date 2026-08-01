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
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";

const serviceCategoryIcons: Record<string, LucideIcon> = {
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
