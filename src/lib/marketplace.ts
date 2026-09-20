import {
  Cpu,
  Gauge,
  Zap,
  CircuitBoard,
  Cog,
  Battery,
  Cable,
  Wrench,
  Radio,
  Boxes,
  Calculator,
  type LucideIcon,
} from "lucide-react";

export const CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "microcontrollers", label: "Microcontrollers", icon: Cpu },
  { value: "sensors", label: "Sensors", icon: Gauge },
  { value: "motors", label: "Motors & Drivers", icon: Cog },
  { value: "modules", label: "Modules", icon: CircuitBoard },
  { value: "calculators", label: "Scientific Calculators", icon: Calculator },
  { value: "power", label: "Power & Batteries", icon: Battery },
  { value: "passives", label: "Passives & ICs", icon: Zap },
  { value: "wires", label: "Wires & Connectors", icon: Cable },
  { value: "tools", label: "Tools", icon: Wrench },
  { value: "comms", label: "RF & Comms", icon: Radio },
  { value: "kits", label: "Kits & Others", icon: Boxes },
];

export const CONDITIONS = ["New", "Like new", "Used - working", "For parts"] as const;

export const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "nearby", label: "Nearby" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function categoryIcon(value: string): LucideIcon {
  return CATEGORIES.find((c) => c.value === value)?.icon ?? Boxes;
}

export function rupees(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);
}

export function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
