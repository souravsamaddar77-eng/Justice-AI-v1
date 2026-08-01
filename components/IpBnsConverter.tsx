"use client";

import { useMemo, useState } from "react";
import { Search, ArrowLeftRight, BookOpen } from "lucide-react";
import { ipcBnsData } from "@/lib/ipc-bns-data";

export default function IpBnsConverter() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return ipcBnsData;
    return ipcBnsData.filter(
      (d) =>
        d.ipcSection.toLowerCase().includes(q) ||
        d.bnsSection.toLowerCase().includes(q) ||
        d.ipcTitle.toLowerCase().includes(q) ||
        d.bnsTitle.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [q]);

  return (
    <div className="card-surface overflow-hidden">
      {/* Search bar */}
      <div className="border-b border-navy-100 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
            <Search className="h-5 w-5" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search IPC section (e.g. 420), BNS, or offence…"
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
          />
        </div>
        <p className="mt-2 text-xs text-navy-500">
          Showing {results.length} of {ipcBnsData.length} mappings · try{" "}
          <button onClick={() => setQuery("420")} className="font-medium text-gold-700 hover:underline">
            420
          </button>
          ,{" "}
          <button onClick={() => setQuery("302")} className="font-medium text-gold-700 hover:underline">
            302
          </button>
          ,{" "}
          <button onClick={() => setQuery("defamation")} className="font-medium text-gold-700 hover:underline">
            defamation
          </button>
        </p>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-2 border-b border-navy-100 bg-navy-50/60 text-xs font-semibold uppercase tracking-wider text-navy-500">
        <div className="flex items-center gap-1.5 px-4 py-3">
          <BookOpen className="h-3.5 w-3.5" /> IPC, 1860 (old)
        </div>
        <div className="flex items-center gap-1.5 px-4 py-3 text-navy-700">
          <ArrowLeftRight className="h-3.5 w-3.5 text-gold-600" /> BNS, 2023 (new)
        </div>
      </div>

      {/* Rows */}
      <div className="max-h-[28rem] divide-y divide-navy-100 overflow-y-auto">
        {results.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-navy-500">
            No mapping found for <span className="font-semibold">"{query}"</span>. Try another section.
          </div>
        ) : (
          results.map((d) => (
            <div key={`${d.ipcSection}-${d.bnsSection}`} className="grid grid-cols-2">
              {/* IPC side */}
              <div className="border-r border-navy-100 p-4">
                <span className="inline-flex items-center rounded-md bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700">
                  §{d.ipcSection}
                </span>
                <p className="mt-2 text-sm font-semibold text-navy-900">{d.ipcTitle}</p>
                <p className="mt-1 text-xs text-navy-500">{d.category}</p>
              </div>
              {/* BNS side */}
              <div className="bg-gold-50/40 p-4">
                <span className="inline-flex items-center rounded-md bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-800">
                  §{d.bnsSection}
                </span>
                <p className="mt-2 text-sm font-semibold text-navy-900">{d.bnsTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-navy-500">{d.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
