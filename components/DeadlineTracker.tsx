import { CalendarClock, Timer } from "lucide-react";

export default function DeadlineTracker({
  daysToRespond,
  deadlineDate,
}: {
  daysToRespond: number | null;
  deadlineDate: string | null;
}) {
  if (daysToRespond === null || !deadlineDate) return <div className="card-surface flex items-center gap-4 p-5"><CalendarClock className="h-6 w-6 shrink-0 text-navy-500"/><div><p className="text-sm font-semibold">No confirmed response date</p><p className="mt-2 text-sm text-navy-500">Review the notice with an advocate before setting a deadline.</p></div></div>;
  const overdue = daysToRespond <= 0;
  const tight = daysToRespond > 0 && daysToRespond <= 7;

  const ring = overdue ? "text-red-600" : tight ? "text-amber-600" : "text-navy-700";
  const bg = overdue ? "from-red-50 to-white" : tight ? "from-amber-50 to-white" : "from-navy-50 to-white";

  return (
    <div className={`card-surface flex items-center gap-4 bg-gradient-to-br ${bg} p-5`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${ring}`}>
        <CalendarClock className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-navy-500">Suggested response date · needs review</p>
        <p className={`text-2xl font-bold ${ring}`}>
          {overdue ? "Overdue" : `${daysToRespond} day${daysToRespond === 1 ? "" : "s"}`}
        </p>
        <p className="text-sm text-navy-500">Date identified: {deadlineDate}</p>
      </div>
      {tight && !overdue && (
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          <Timer className="h-3.5 w-3.5" /> Act soon
        </span>
      )}
    </div>
  );
}
