// ─────────────────────────────────────────────────────────────
//  Lok Adalat Schedule dataset — West Bengal districts
//  ⚠️ DEMO DATASET — mock schedule for hackathon demo
//  Real data source: https://www.doj.gov.in/lok-adalat/
//  ─────────────────────────────────────────────────────────────

export interface LokAdalatEntry {
  id: string;
  district: string;
  court: string;
  date: string; // ISO date string (yyyy-mm-dd)
  time: string; // e.g., "10:00 AM - 1:00 PM"
  type: "National" | "State" | "District" | "Taluk" | "Mobile";
  cases: number; // number of cases listed
  categories: string[]; // e.g., ["Civil", "Compoundable Criminal", "Family", "Revenue"]
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
  notes?: string;
}

export const lokAdalatSchedule: LokAdalatEntry[] = [
  // KOLKATA
  {
    id: "kolkata-1",
    district: "Kolkata",
    court: "City Civil Court, Kolkata",
    date: "2026-08-16",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 45,
    categories: ["Civil", "Compoundable Criminal", "Family"],
    status: "Upcoming",
    notes: "Pre-litigation petitions prioritised",
  },
  {
    id: "kolkata-2",
    district: "Kolkata",
    court: "High Court Legal Services Committee",
    date: "2026-08-23",
    time: "10:00 AM - 2:00 PM",
    type: "State",
    cases: 120,
    categories: ["Civil", "Family", "Revenue", "MACT"],
    status: "Upcoming",
    notes: "Motor accident claims (MACT) fast-track",
  },
  {
    id: "kolkata-3",
    district: "Kolkata",
    court: "Metropolitan Magistrate Court, Bichar Bhawan",
    date: "2026-09-06",
    time: "11:00 AM - 1:00 PM",
    type: "Taluk",
    cases: 30,
    categories: ["Compoundable Criminal", "NI Act 138"],
    status: "Upcoming",
  },

  // NORTH 24 PARGANAS
  {
    id: "n24p-1",
    district: "North 24 Parganas",
    court: "District Court, Barasat",
    date: "2026-08-18",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 60,
    categories: ["Civil", "Family", "Compoundable Criminal"],
    status: "Upcoming",
    notes: "Land dispute cases encouraged",
  },
  {
    id: "n24p-2",
    district: "North 24 Parganas",
    court: "Mobile Lok Adalat, Rajarhat",
    date: "2026-08-30",
    time: "10:00 AM - 2:00 PM",
    type: "Mobile",
    cases: 25,
    categories: ["Civil", "Revenue", "Family"],
    status: "Upcoming",
  },

  // SOUTH 24 PARGANAS
  {
    id: "s24p-1",
    district: "South 24 Parganas",
    court: "District Court, Alipore",
    date: "2026-08-20",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 55,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },
  {
    id: "s24p-2",
    district: "South 24 Parganas",
    court: "Sub-Divisional Court, Baruipur",
    date: "2026-09-03",
    time: "10:30 AM - 12:30 PM",
    type: "Taluk",
    cases: 20,
    categories: ["Civil", "NI Act 138", "Family"],
    status: "Upcoming",
  },

  // HOWRAH
  {
    id: "howrah-1",
    district: "Howrah",
    court: "District Court, Howrah",
    date: "2026-08-17",
    time: "10:00 AM - 2:00 PM",
    type: "District",
    cases: 70,
    categories: ["Civil", "Compoundable Criminal", "Family", "MACT"],
    status: "Upcoming",
    notes: "Special bench for cheque bounce cases",
  },
  {
    id: "howrah-2",
    district: "Howrah",
    court: "Sub-Divisional Court, Uluberia",
    date: "2026-09-01",
    time: "11:00 AM - 1:00 PM",
    type: "Taluk",
    cases: 28,
    categories: ["Civil", "Family", "Revenue"],
    status: "Upcoming",
  },

  // HOOGHLY
  {
    id: "hooghly-1",
    district: "Hooghly",
    court: "District Court, Chinsurah",
    date: "2026-08-19",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 50,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },
  {
    id: "hooghly-2",
    district: "Hooghly",
    court: "Mobile Lok Adalat, Chandannagar",
    date: "2026-09-05",
    time: "10:00 AM - 2:00 PM",
    type: "Mobile",
    cases: 22,
    categories: ["Civil", "Family", "NI Act 138"],
    status: "Upcoming",
  },

  // PASCHIM MEDINIPUR
  {
    id: "paschim-medinipur-1",
    district: "Paschim Medinipur",
    court: "District Court, Midnapore",
    date: "2026-08-22",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 48,
    categories: ["Civil", "Compoundable Criminal", "Family", "Revenue"],
    status: "Upcoming",
  },
  {
    id: "paschim-medinipur-2",
    district: "Paschim Medinipur",
    court: "Sub-Divisional Court, Kharagpur",
    date: "2026-09-07",
    time: "10:30 AM - 12:30 PM",
    type: "Taluk",
    cases: 18,
    categories: ["Civil", "NI Act 138", "Family"],
    status: "Upcoming",
  },

  // PURBA MEDINIPUR
  {
    id: "purba-medinipur-1",
    district: "Purba Medinipur",
    court: "District Court, Tamluk",
    date: "2026-08-25",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 42,
    categories: ["Civil", "Family", "Compoundable Criminal"],
    status: "Upcoming",
  },

  // BARDHAMAN (PURBA & PASCHIM)
  {
    id: "paschim-bardhaman-1",
    district: "Paschim Bardhaman",
    court: "District Court, Asansol",
    date: "2026-08-21",
    time: "10:00 AM - 2:00 PM",
    type: "District",
    cases: 55,
    categories: ["Civil", "Compoundable Criminal", "Family", "MACT", "Labour"],
    status: "Upcoming",
  },
  {
    id: "purba-bardhaman-1",
    district: "Purba Bardhaman",
    court: "District Court, Bardhaman",
    date: "2026-08-28",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 40,
    categories: ["Civil", "Family", "Revenue", "Compoundable Criminal"],
    status: "Upcoming",
  },

  // BIRBHUM
  {
    id: "birbhum-1",
    district: "Birbhum",
    court: "District Court, Suri",
    date: "2026-08-24",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 35,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },

  // BANKURA
  {
    id: "bankura-1",
    district: "Bankura",
    court: "District Court, Bankura",
    date: "2026-08-26",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 38,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },

  // PURULIA
  {
    id: "purulia-1",
    district: "Purulia",
    court: "District Court, Purulia",
    date: "2026-08-29",
    time: "10:00 AM - 2:00 PM",
    type: "District",
    cases: 30,
    categories: ["Civil", "Family", "Compoundable Criminal"],
    status: "Upcoming",
  },

  // MALDA
  {
    id: "malda-1",
    district: "Malda",
    court: "District Court, Malda",
    date: "2026-08-31",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 45,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },

  // UTTAR DINAJPUR
  {
    id: "uttar-dinajpur-1",
    district: "Uttar Dinajpur",
    court: "District Court, Raiganj",
    date: "2026-09-02",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 32,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },

  // DAKSHIN DINAJPUR
  {
    id: "dakshin-dinajpur-1",
    district: "Dakshin Dinajpur",
    court: "District Court, Balurghat",
    date: "2026-09-04",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 28,
    categories: ["Civil", "Family", "Compoundable Criminal"],
    status: "Upcoming",
  },

  // JALPAIGURI
  {
    id: "jalpaiguri-1",
    district: "Jalpaiguri",
    court: "District Court, Jalpaiguri",
    date: "2026-09-08",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 36,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },

  // ALIPURDUAR
  {
    id: "alipurduar-1",
    district: "Alipurduar",
    court: "District Court, Alipurduar",
    date: "2026-09-09",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 25,
    categories: ["Civil", "Family", "Compoundable Criminal"],
    status: "Upcoming",
  },

  // COOCH BEHAR
  {
    id: "coochbehar-1",
    district: "Cooch Behar",
    court: "District Court, Cooch Behar",
    date: "2026-09-10",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 30,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },

  // DARJEELING
  {
    id: "darjeeling-1",
    district: "Darjeeling",
    court: "District Court, Darjeeling",
    date: "2026-09-11",
    time: "10:30 AM - 1:30 PM",
    type: "District",
    cases: 22,
    categories: ["Civil", "Family", "Compoundable Criminal", "Revenue"],
    status: "Upcoming",
  },

  // KALIMPONG
  {
    id: "kalimpong-1",
    district: "Kalimpong",
    court: "District Court, Kalimpong",
    date: "2026-09-12",
    time: "10:00 AM - 1:00 PM",
    type: "District",
    cases: 18,
    categories: ["Civil", "Family", "Compoundable Criminal"],
    status: "Upcoming",
  },

  // NATIONAL LOK ADALAT (quarterly)
  {
    id: "national-1",
    district: "All Districts",
    court: "All Courts in West Bengal",
    date: "2026-09-13",
    time: "10:00 AM - 4:00 PM",
    type: "National",
    cases: 2500,
    categories: ["All Categories"],
    status: "Upcoming",
    notes: "National Lok Adalat — maximum settlement drive",
  },
];

/**
 * Get unique districts from the schedule
 */
export function getDistricts(): string[] {
  return Array.from(new Set(lokAdalatSchedule.map((entry) => entry.district))).sort();
}

/**
 * Get unique courts for a district
 */
export function getCourtsByDistrict(district: string): string[] {
  return Array.from(
    new Set(
      lokAdalatSchedule
        .filter((entry) => entry.district === district)
        .map((entry) => entry.court)
    )
  ).sort();
}

/**
 * Get schedule entries filtered by district and optionally court
 */
export function getScheduleByDistrict(district?: string): LokAdalatEntry[] {
  if (!district) return [...lokAdalatSchedule].sort((a, b) => a.date.localeCompare(b.date));
  return lokAdalatSchedule
    .filter((entry) => entry.district === district)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get upcoming entries only
 */
export function getUpcomingSchedule(): LokAdalatEntry[] {
  const today = new Date().toISOString().slice(0, 10);
  return lokAdalatSchedule
    .filter((entry) => entry.date >= today && entry.status === "Upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Format date for display
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get category badge color class
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Civil: "bg-blue-100 text-blue-800",
    "Compoundable Criminal": "bg-red-100 text-red-800",
    Family: "bg-pink-100 text-pink-800",
    Revenue: "bg-amber-100 text-amber-800",
    MACT: "bg-purple-100 text-purple-800",
    "NI Act 138": "bg-orange-100 text-orange-800",
    Labour: "bg-green-100 text-green-800",
    "All Categories": "bg-navy-100 text-navy-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: LokAdalatEntry["status"]): string {
  const colors: Record<string, string> = {
    Upcoming: "bg-green-100 text-green-800",
    Ongoing: "bg-blue-100 text-blue-800",
    Completed: "bg-gray-100 text-gray-800",
    Cancelled: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * Get type badge color class
 */
export function getTypeColor(type: LokAdalatEntry["type"]): string {
  const colors: Record<string, string> = {
    National: "bg-gold-100 text-gold-800",
    State: "bg-purple-100 text-purple-800",
    District: "bg-blue-100 text-blue-800",
    Taluk: "bg-green-100 text-green-800",
    Mobile: "bg-orange-100 text-orange-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}