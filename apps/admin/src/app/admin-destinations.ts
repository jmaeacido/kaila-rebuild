import {
  BarChart3,
  Construction,
  FileCheck2,
  HeartHandshake,
  Scale,
  ShieldAlert,
  UserRoundX,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminDestination = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminDestinations: AdminDestination[] = [
  { href: "/", label: "Review", icon: FileCheck2 },
  { href: "/users", label: "People", icon: Users },
  { href: "/maintenance", label: "Maintenance", icon: Construction },
  { href: "/support", label: "Support", icon: HeartHandshake },
  { href: "/cases", label: "Disputes", icon: Scale },
  { href: "/reports", label: "Safety", icon: ShieldAlert },
  { href: "/account-deletions", label: "Deletions", icon: UserRoundX },
  { href: "/analytics", label: "Insights", icon: BarChart3 },
];
