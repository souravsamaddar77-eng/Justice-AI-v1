import type { LucideIcon } from "lucide-react";

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  accent = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-0.5 ${
        accent
          ? "border-gold-300/50 bg-gradient-to-br from-navy-900 to-navy-800 text-white"
          : "card-surface text-navy-800 hover:shadow-lg"
      }`}
    >
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/15">
        <Icon className={`h-6 w-6 ${accent ? "text-gold-300" : "text-gold-600"}`} strokeWidth={1.9} />
      </div>
      <h3 className={`text-lg font-semibold ${accent ? "text-white" : "text-navy-900"}`}>{title}</h3>
      <p className={`mt-2 text-sm leading-relaxed ${accent ? "text-navy-300" : "text-navy-600"}`}>
        {description}
      </p>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-gold-500/40 to-transparent" />
    </div>
  );
}
