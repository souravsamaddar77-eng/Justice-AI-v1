"use client";

import { useMemo, useState } from "react";
import { Search, Filter, Calendar, Clock, MapPin, Gavel, Award, ArrowUpDown, ChevronDown } from "lucide-react";
import {
  lokAdalatSchedule,
  getDistricts,
  getScheduleByDistrict,
  getUpcomingSchedule,
  formatDate,
  getCategoryColor,
  getStatusColor,
  getTypeColor,
  type LokAdalatEntry,
} from "@/lib/lok-adalat-data";

export default function LokAdalatUpdates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "district" | "cases">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(true);

  const districts = useMemo(() => getDistricts(), []);
  const types = useMemo(() => Array.from(new Set(lokAdalatSchedule.map((e) => e.type))), []);

  const filteredEntries = useMemo(() => {
    let entries = showOnlyUpcoming ? getUpcomingSchedule() : lokAdalatSchedule;

    if (selectedDistrict !== "all") {
      entries = entries.filter((e) => e.district === selectedDistrict);
    }

    if (selectedType !== "all") {
      entries = entries.filter((e) => e.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          e.district.toLowerCase().includes(q) ||
          e.court.toLowerCase().includes(q) ||
          e.categories.some((c) => c.toLowerCase().includes(q)) ||
          e.notes?.toLowerCase().includes(q)
      );
    }

    // Sort
    entries.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortBy) {
        case "district":
          aVal = a.district;
          bVal = b.district;
          break;
        case "cases":
          aVal = a.cases;
          bVal = b.cases;
          break;
        case "date":
        default:
          aVal = a.date;
          bVal = b.date;
          break;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return entries;
  }, [searchQuery, selectedDistrict, selectedType, sortBy, sortOrder, showOnlyUpcoming]);

  const handleSort = (field: "date" | "district" | "cases") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: "date" | "district" | "cases") => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-navy-300" />;
    return sortOrder === "asc" ? (
      <svg className="h-3.5 w-3.5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-3.5 w-3.5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-300 shrink-0">
          <Gavel className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-navy-900">Lok Adalat Schedule</h2>
          <p className="mt-1 text-sm text-navy-500">
            Search and filter Lok Adalat sittings across all West Bengal districts. National Lok Adalat on Sep 13.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card-surface p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search district, court, case type, notes…"
            className="w-full rounded-xl border border-navy-200 pl-12 pr-4 py-2.5 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* District Filter */}
          <div className="relative flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-navy-500 mb-1">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full rounded-xl border border-navy-200 px-4 py-2.5 text-sm text-navy-700 bg-white focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200 appearance-none pr-10"
            >
              <option value="all">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-7 h-4 w-4 text-navy-400 pointer-events-none" />
          </div>

          {/* Type Filter */}
          <div className="relative flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-navy-500 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border border-navy-200 px-4 py-2.5 text-sm text-navy-700 bg-white focus:outline-none focus:border-gold-400 focus:ring-gold-200 appearance-none pr-10"
            >
              <option value="all">All Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-7 h-4 w-4 text-navy-400 pointer-events-none" />
          </div>

          {/* Upcoming Only Toggle */}
          <label className="flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2.5 cursor-pointer hover:border-gold-300 hover:bg-gold-50/50 transition-colors">
            <input
              type="checkbox"
              checked={showOnlyUpcoming}
              onChange={(e) => setShowOnlyUpcoming(e.target.checked)}
              className="h-4 w-4 rounded border-navy-300 text-gold-600 focus:ring-gold-500"
            />
            <span className="text-sm font-medium text-navy-700">Upcoming only</span>
          </label>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-navy-500 pt-2 border-t border-navy-100">
          <span>Showing <span className="font-semibold text-navy-900">{filteredEntries.length}</span> of {lokAdalatSchedule.length} sittings</span>
          <div className="flex items-center gap-2">
            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value as "date" | "district" | "cases")}
              className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs text-navy-700 bg-white focus:outline-none focus:border-gold-400"
            >
              <option value="date">Sort by Date</option>
              <option value="district">Sort by District</option>
              <option value="cases">Sort by Cases</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="rounded-lg border border-navy-200 px-3 py-1.5 hover:border-gold-400 hover:bg-gold-50/50 transition-colors"
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="card-surface overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-navy-200" />
            <p className="mt-3 text-navy-500">No Lok Adalat sittings match your filters</p>
            <p className="mt-1 text-sm text-navy-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1fr_0.8fr] border-b border-navy-100 bg-navy-50/60 text-xs font-semibold uppercase tracking-wider text-navy-500 px-4 py-3">
              <button onClick={() => handleSort("date")} className="flex items-center gap-1 hover:text-gold-700">
                <Calendar className="h-3.5 w-3.5" />
                Date {getSortIcon("date")}
              </button>
              <button onClick={() => handleSort("district")} className="flex items-center gap-1 hover:text-gold-700">
                <MapPin className="h-3.5 w-3.5" />
                District {getSortIcon("district")}
              </button>
              <div className="flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                Type
              </div>
              <div className="flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5" />
                Court
              </div>
              <button onClick={() => handleSort("cases")} className="flex items-center gap-1 hover:text-gold-700">
                Cases {getSortIcon("cases")}
              </button>
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                Categories
              </div>
              <div>Status</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-navy-100">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1fr_0.8fr] gap-0 hover:bg-navy-50/30 transition-colors"
                >
                  {/* Date */}
                  <div className="md:px-4 py-3">
                    <div className="text-sm font-medium text-navy-900">{formatDate(entry.date)}</div>
                    <div className="mt-0.5 text-xs text-navy-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.time}
                    </div>
                  </div>

                  {/* District */}
                  <div className="md:px-4 py-3 border-y border-navy-100 md:border-y-0 md:border-x border-navy-100">
                    <div className="text-sm font-medium text-navy-900">{entry.district}</div>
                    <div className="mt-0.5 text-xs text-navy-500 truncate">{entry.court}</div>
                  </div>

                  {/* Type */}
                  <div className="md:px-4 py-3 border-y border-navy-100 md:border-y-0 md:border-x border-navy-100 flex items-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeColor(entry.type)}`}>
                      {entry.type}
                    </span>
                  </div>

                  {/* Court (mobile only) */}
                  <div className="md:hidden px-4 py-2 border-y border-navy-100 text-xs text-navy-500">
                    {entry.court}
                  </div>

                  {/* Cases */}
                  <div className="md:px-4 py-3 border-y border-navy-100 md:border-y-0 md:border-x border-navy-100 flex items-center">
                    <span className="text-sm font-semibold text-navy-900">{entry.cases}</span>
                    <span className="ml-2 text-xs text-navy-500">cases</span>
                  </div>

                  {/* Categories */}
                  <div className="md:px-4 py-3 border-y border-navy-100 md:border-y-0 md:border-x border-navy-100 flex flex-wrap gap-1">
                    {entry.categories.map((cat) => (
                      <span key={cat} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getCategoryColor(cat)}`}>
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Status */}
                  <div className="md:px-4 py-3 border-y border-navy-100 md:border-y-0 md:border-x border-navy-100 flex items-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))}

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-navy-100">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                          <Calendar className="h-4 w-4 text-gold-600" />
                          {formatDate(entry.date)}
                        </div>
                        <div className="mt-1 text-xs text-navy-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {entry.time}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(entry.status)} shrink-0`}>
                        {entry.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(entry.type)}`}>
                        {entry.type}
                      </span>
                      {entry.categories.map((cat) => (
                        <span key={cat} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColor(cat)}`}>
                          {cat}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 text-sm text-navy-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="font-medium text-navy-900">{entry.district}</span>
                      </div>
                      <div className="flex items-center gap-1 text-navy-500">
                        <Gavel className="h-3.5 w-3.5" />
                        {entry.court}
                      </div>
                      <div className="flex items-center gap-1 text-navy-500">
                        <Award className="h-3.5 w-3.5" />
                        {entry.cases} cases listed
                      </div>
                    </div>

                    {entry.notes && (
                      <div className="mt-3 p-2 rounded-lg bg-gold-50/50 border border-gold-100">
                        <p className="text-xs text-gold-900">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info Card */}
      <div className="card-surface border border-navy-100 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-700 shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div className="text-sm text-navy-600">
            <p className="font-medium text-navy-900 mb-2">About Lok Adalat</p>
            <ul className="list-disc list-inside space-y-1 text-navy-500">
              <li>Free, voluntary, and consensual dispute resolution</li>
              <li>No court fees; awards are final and enforceable as decrees</li>
              <li>Covers civil, compoundable criminal, family, revenue, MACT, NI Act cases</li>
              <li>
                National Lok Adalats held quarterly across all districts — next: <span className="font-semibold">13 Sep
                  2026</span>
              </li>
              <li>Contact your District Legal Services Authority (DLSA) to register a case</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}