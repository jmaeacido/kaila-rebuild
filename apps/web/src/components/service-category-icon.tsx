import {
  Bike,
  BookOpen,
  Camera,
  Car,
  Cog,
  Drill,
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

export function ServiceCategoryIcon({
  icon,
  ...props
}: LucideProps & { icon: string }) {
  const Icon = serviceCategoryIcons[icon] ?? Wrench;
  return <Icon {...props} />;
}
