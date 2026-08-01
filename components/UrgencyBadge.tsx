import { AlertTriangle, AlertCircle, ShieldCheck } from "lucide-react";
import type { Urgency } from "@/types";

const STYLES: Record<Urgency, { cls: string; icon: typeof AlertTriangle; label: string }> = {
  High: { cls: "bg-red-50 text-red-700 ring-red-200", icon: AlertTriangle, label: "High urgency" },
  Medium: { cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: AlertCircle, label: "Medium urgency" },
  Low: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: ShieldCheck, label: "Low urgency" },
};

export default function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const s = STYLES[urgency];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${s.cls}`}>
      <Icon className="h-4 w-4" />
      {s.label}
    </span>
  );
}
