import { ListChecks, Sparkles } from "lucide-react";

export default function SummaryCard({ summary }: { summary: string[] }) {
  return (
    <div className="card-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/15">
          <Sparkles className="h-4 w-4 text-gold-600" />
        </span>
        <h3 className="font-serif text-lg font-semibold text-navy-900">Plain-Language Summary</h3>
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-400">
        <ListChecks className="h-3.5 w-3.5" /> What this notice means, simply
      </p>
      <ul className="space-y-3">
        {summary.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-navy-700">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-xs font-bold text-gold-700">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
