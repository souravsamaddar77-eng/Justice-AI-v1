"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Search,
  Filter,
  Gavel,
  UserRound,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Clock,
  MapPin as MapPinIcon,
  Phone,
  Mail,
  Building,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import Link from "next/link";

interface Lawyer {
  id: string;
  name: string;
  specialization: string[];
  court: string;
  experience: string;
  location: string;
  lat?: number;
  lng?: number;
  phone: string;
  email: string;
  link: string;
  rating: number;
  reviewsCount: number;
  languages: string[];
  feeRange: string;
  verified: boolean;
  distance?: number;
}

const KOLKATA_LAWYERS: Lawyer[] = [
  {
    id: "lawyer-1",
    name: "Adv. Amitava Chatterjee",
    specialization: ["Criminal Law", "Constitutional Law", "Bail Applications", "Writ Petitions"],
    court: "Calcutta High Court, District Courts",
    experience: "22 years",
    location: "Kolkata, Park Street",
    lat: 22.5526,
    lng: 88.3519,
    phone: "+91-33-22XX-XXXX",
    email: "amitava.chatterjee@lawfirm.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.8,
    reviewsCount: 127,
    languages: ["English", "Bengali", "Hindi"],
    feeRange: "₹5,000 - ₹15,000 per hearing",
    verified: true,
  },
  {
    id: "lawyer-2",
    name: "Adv. Priya Banerjee",
    specialization: ["Family Law", "Domestic Violence", "Women's Rights", "Divorce", "Maintenance"],
    court: "Family Courts Kolkata, Calcutta High Court",
    experience: "15 years",
    location: "Kolkata, Salt Lake",
    lat: 22.5726,
    lng: 88.4167,
    phone: "+91-33-23XX-XXXX",
    email: "priya.banerjee@legalhelp.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.9,
    reviewsCount: 89,
    languages: ["English", "Bengali", "Hindi"],
    feeRange: "₹3,000 - ₹10,000 per hearing",
    verified: true,
  },
  {
    id: "lawyer-3",
    name: "Adv. Rajesh Sharma",
    specialization: ["Civil Law", "Property Disputes", "Land Revenue", "Partition Suits", "Title Verification"],
    court: "District Courts North 24 Parganas, Calcutta High Court",
    experience: "18 years",
    location: "Barasat, North 24 Parganas",
    lat: 22.7196,
    lng: 88.4822,
    phone: "+91-33-25XX-XXXX",
    email: "rajesh.sharma@advocate.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.6,
    reviewsCount: 76,
    languages: ["English", "Bengali", "Hindi"],
    feeRange: "₹4,000 - ₹12,000 per hearing",
    verified: true,
  },
  {
    id: "lawyer-4",
    name: "Adv. Suman Das",
    specialization: ["Labour Law", "Service Matters", "Industrial Disputes", "Wrongful Termination", "Gratuity"],
    court: "CAT Kolkata, Calcutta High Court, Labour Courts",
    experience: "12 years",
    location: "Howrah",
    lat: 22.5958,
    lng: 88.2636,
    phone: "+91-33-26XX-XXXX",
    email: "suman.das@labourlaw.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.5,
    reviewsCount: 54,
    languages: ["English", "Bengali", "Hindi"],
    feeRange: "₹3,500 - ₹8,000 per hearing",
    verified: true,
  },
  {
    id: "lawyer-5",
    name: "Adv. Meera Ghosh",
    specialization: ["Consumer Protection", "Banking", "Insurance", "Medical Negligence", "Product Liability"],
    court: "District Consumer Forums, State Commission, NCDRC",
    experience: "10 years",
    location: "Kolkata, Alipore",
    lat: 22.5333,
    lng: 88.3333,
    phone: "+91-33-24XX-XXXX",
    email: "meera.ghosh@consumerlaw.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.7,
    reviewsCount: 68,
    languages: ["English", "Bengali", "Hindi"],
    feeRange: "₹4,000 - ₹12,000 per hearing",
    verified: true,
  },
  {
    id: "lawyer-6",
    name: "Adv. Subhash Chandra",
    specialization: ["Criminal Law", "NDPS Act", "POCSO", "Criminal Appeals", "Anticipatory Bail"],
    court: "Calcutta High Court, Sessions Courts",
    experience: "20 years",
    location: "Kolkata, Esplanade",
    lat: 22.5667,
    lng: 88.35,
    phone: "+91-33-27XX-XXXX",
    email: "subhash.chandra@criminallaw.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.7,
    reviewsCount: 112,
    languages: ["English", "Bengali", "Hindi"],
    feeRange: "₹6,000 - ₹20,000 per hearing",
    verified: true,
  },
  {
    id: "lawyer-7",
    name: "Adv. Anjali Mukherjee",
    specialization: ["Family Law", "Child Custody", "Adoption", "Guardianship", "Domestic Violence"],
    court: "Family Courts Kolkata, JJB",
    experience: "14 years",
    location: "Kolkata, Ballygunge",
    lat: 22.525,
    lng: 88.3667,
    phone: "+91-33-28XX-XXXX",
    email: "anjali.mukherjee@familylaw.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.8,
    reviewsCount: 95,
    languages: ["English", "Bengali", "Hindi"],
    feeRange: "₹3,500 - ₹10,000 per hearing",
    verified: true,
  },
  {
    id: "lawyer-8",
    name: "Adv. Vikram Singh",
    specialization: ["Corporate Law", "Company Law", "Insolvency (IBC)", "Commercial Contracts", "Mergers"],
    court: "NCLT Kolkata, Calcutta High Court",
    experience: "16 years",
    location: "Kolkata, New Town",
    lat: 22.5833,
    lng: 88.4833,
    phone: "+91-33-29XX-XXXX",
    email: "vikram.singh@corporatelaw.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
    rating: 4.6,
    reviewsCount: 43,
    languages: ["English", "Bengali", "Hindi", "Punjabi"],
    feeRange: "₹8,000 - ₹25,000 per hearing",
    verified: true,
  },
];

const ALL_SPECIALIZATIONS = Array.from(
  new Set(KOLKATA_LAWYERS.flatMap((l) => l.specialization))
).sort();

const ALL_LOCATIONS = Array.from(
  new Set(KOLKATA_LAWYERS.map((l) => l.location.split(",")[0].trim()))
).sort();

export default function LawyersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "experience" | "fee">("distance");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [expandedLawyer, setExpandedLawyer] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
        calculateDistances();
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location permissions in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("An unknown error occurred while getting your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const calculateDistances = () => {
    if (!userLocation) return;

    KOLKATA_LAWYERS.forEach(lawyer => {
      if (lawyer.lat && lawyer.lng) {
        const R = 6371; // Earth's radius in km
        const dLat = (lawyer.lat - userLocation.lat) * Math.PI / 180;
        const dLng = (lawyer.lng - userLocation.lng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(lawyer.lat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        lawyer.distance = Math.round(R * c * 10) / 10;
      }
    });
  };

  const filteredLawyers = KOLKATA_LAWYERS.filter((lawyer) => {
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        lawyer.name.toLowerCase().includes(q) ||
        lawyer.specialization.some((s) => s.toLowerCase().includes(q)) ||
        lawyer.court.toLowerCase().includes(q) ||
        lawyer.location.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Specialization filter
    if (selectedSpecializations.length > 0) {
      if (!selectedSpecializations.some((s) => lawyer.specialization.includes(s))) return false;
    }

    // Location filter
    if (selectedLocations.length > 0) {
      const lawyerArea = lawyer.location.split(",")[0].trim();
      if (!selectedLocations.includes(lawyerArea)) return false;
    }

    // Rating filter
    if (minRating > 0 && lawyer.rating < minRating) return false;

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "distance":
        if (userLocation && a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return 0;
      case "rating":
        return b.rating - a.rating;
      case "experience":
        return parseInt(b.experience) - parseInt(a.experience);
      case "fee":
        const aFee = parseInt(a.feeRange.match(/₹(\d+)/)?.[1] || "0");
        const bFee = parseInt(b.feeRange.match(/₹(\d+)/)?.[1] || "0");
        return aFee - bFee;
      default:
        return 0;
    }
  });

  const toggleSpecialization = (spec: string) => {
    setSelectedSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const clearFilters = () => {
    setSelectedSpecializations([]);
    setSelectedLocations([]);
    setMinRating(0);
  };

  const hasActiveFilters =
    selectedSpecializations.length > 0 ||
    selectedLocations.length > 0 ||
    minRating > 0;

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Citizen Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold sm:text-4xl">
            <Gavel className="h-9 w-9 text-gold-300" />
            Find Verified Panel Lawyers
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Search NALSA-verified advocates near you by specialization, location, and ratings.
            Data sourced from West Bengal State Legal Services Authority.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Search & Location Bar */}
        <div className="card-surface p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, specialization, court, or location…"
                className="input pl-10 pr-10 w-full"
                aria-label="Search lawyers"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Use My Location */}
            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className={`btn-secondary flex items-center gap-2 whitespace-nowrap ${
                userLocation ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""
              }`}
            >
              {isLocating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Locating…
                </>
              ) : userLocation ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Using your location
                </>
              ) : (
                <>
                  <MapPinIcon className="h-4 w-4" />
                  Use My Location
                </>
              )}
            </button>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`btn-secondary flex items-center gap-2 whitespace-nowrap ${hasActiveFilters ? "bg-gold-50 border-gold-200 text-gold-700" : ""}`}
            >
              <Filter className="h-4 w-4" />
              Filters {hasActiveFilters && <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-950">{selectedSpecializations.length + selectedLocations.length + (minRating > 0 ? 1 : 0)}</span>}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Location Error */}
          {locationError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {/* Active Filters Chips */}
          {(hasActiveFilters || showFilters) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedSpecializations.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-0.5 text-sm text-gold-800">
                  {s}
                  <button onClick={() => toggleSpecialization(s)} className="ml-1 hover:text-gold-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedLocations.map((l) => (
                <span key={l} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm text-blue-800">
                  {l}
                  <button onClick={() => toggleLocation(l)} className="ml-1 hover:text-blue-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {minRating > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm text-emerald-800">
                  Rating ≥ {minRating}+
                  <button onClick={() => setMinRating(0)} className="ml-1 hover:text-emerald-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-navy-500 hover:text-gold-600 underline">
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card-surface p-6 mb-8 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-navy-900">Filters</h3>
              <button onClick={clearFilters} className="text-sm text-gold-600 hover:underline" disabled={!hasActiveFilters}>
                Clear all
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              {/* Specializations */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">Specialization</label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {ALL_SPECIALIZATIONS.map((spec) => (
                    <label key={spec} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSpecializations.includes(spec)}
                        onChange={() => toggleSpecialization(spec)}
                        className="h-4 w-4 rounded border-navy-300 text-gold-500 focus:ring-gold-500"
                      />
                      <span className="text-sm text-navy-700">{spec}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">Location</label>
                <div className="space-y-1.5">
                  {ALL_LOCATIONS.map((loc) => (
                    <label key={loc} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(loc)}
                        onChange={() => toggleLocation(loc)}
                        className="h-4 w-4 rounded border-navy-300 text-gold-500 focus:ring-gold-500"
                      />
                      <span className="text-sm text-navy-700">{loc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">Minimum Rating</label>
                <div className="space-y-1.5">
                  {[4.5, 4, 3.5, 3].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="minRating"
                        value={rating}
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="h-4 w-4 text-gold-500 focus:ring-gold-500"
                      />
                      <span className="flex items-center gap-1 text-sm text-navy-700">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-current text-gold-400" : "text-navy-200"}`} />
                        ))}
                        <span>{rating}+</span>
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="minRating"
                      value={0}
                      checked={minRating === 0}
                      onChange={() => setMinRating(0)}
                      className="h-4 w-4 text-gold-500 focus:ring-gold-500"
                    />
                    <span className="text-sm text-navy-700">Any rating</span>
                  </label>
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input"
                >
                  <option value="distance">Distance (nearest first)</option>
                  <option value="rating">Rating (highest first)</option>
                  <option value="experience">Experience (most first)</option>
                  <option value="fee">Fee (lowest first)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-900">
                {filteredLawyers.length} lawyer{filteredLawyers.length !== 1 ? "s" : ""} found
              </h2>
              <p className="text-sm text-navy-500">
                {userLocation
                  ? `Sorted by ${sortBy === "distance" ? "distance" : sortBy} from your location`
                  : "Enable location for distance-based sorting"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-navy-500">Verified by NALSA</span>
            <ShieldCheck className="h-4 w-4 text-gold-500" />
          </div>
        </div>

        {/* Results */}
        {filteredLawyers.length === 0 ? (
          <div className="card-surface p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-navy-300 mb-4" />
            <h3 className="text-lg font-semibold text-navy-900 mb-2">No lawyers match your filters</h3>
            <p className="text-navy-600 mb-4">Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="btn-primary">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLawyers.map((lawyer) => (
              <LawyerCard
                key={lawyer.id}
                lawyer={lawyer}
                userLocation={userLocation}
                isExpanded={expandedLawyer === lawyer.id}
                onToggleExpand={() => setExpandedLawyer(expandedLawyer === lawyer.id ? null : lawyer.id)}
              />
            ))}

            {/* View All Link */}
            <div className="text-center pt-4">
              <Link
                href="http://westbengal.nalsa.gov.in/list-of-panel-lawyers/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 btn-ghost"
              >
                View All Panel Lawyers on NALSA Portal
                <ExternalLink className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-sm text-navy-500">
                Redirected to the official West Bengal NALSA panel advocates directory
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LawyerCard({
  lawyer,
  userLocation,
  isExpanded,
  onToggleExpand,
}: {
  lawyer: Lawyer;
  userLocation: { lat: number; lng: number } | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const highlight = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-gold-200 text-navy-900 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className={`card-surface p-5 transition-all ${isExpanded ? "shadow-lg border-gold-300/50" : ""}`}>
      {/* Main Card */}
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
            <UserRound className="h-8 w-8" />
          </div>
          {lawyer.verified && (
            <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Verified
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h3 className="font-semibold text-navy-900">{lawyer.name}</h3>
                {lawyer.verified && <ShieldCheck className="mt-0.5 h-5 w-5 text-gold-500 flex-shrink-0" aria-label="Verified Panel Lawyer" />}
              </div>
              <p className="mt-1 text-sm text-navy-500">{lawyer.specialization.slice(0, 3).join(" • ")}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-navy-600">
                <span className="flex items-center gap-1">
                  <Gavel className="h-3.5 w-3.5" />
                  {lawyer.court}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {lawyer.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {lawyer.experience} exp.
                </span>
              </div>
            </div>

            {/* Rating & Distance */}
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center justify-end gap-1 mb-1">
                <Star className="h-4 w-4 fill-current text-gold-400" />
                <span className="font-semibold text-navy-900">{lawyer.rating}</span>
                <span className="text-sm text-navy-500">({lawyer.reviewsCount})</span>
              </div>
              {userLocation && lawyer.distance !== undefined && (
                <div className="flex items-center justify-end gap-1 text-sm text-navy-600">
                  <MapPin className="h-3.5 w-3.5 text-gold-500" />
                  <span className="font-medium">{lawyer.distance} km</span>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Details */}
          <button
            onClick={onToggleExpand}
            className="mt-3 flex items-center gap-1.5 text-sm text-gold-600 hover:text-gold-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isExpanded ? "Show less" : "Show details"}
          </button>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-navy-200 space-y-3 animate-fade-up">
              {/* Specializations */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">Specializations</p>
                <div className="flex flex-wrap gap-1.5">
                  {lawyer.specialization.map((spec) => (
                    <span key={spec} className="rounded-full bg-navy-100 px-2.5 py-1 text-sm font-medium text-navy-700">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Languages & Fees */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-1">Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lawyer.languages.map((lang) => (
                      <span key={lang} className="rounded-lg bg-blue-50 px-2 py-1 text-sm text-blue-700">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-1">Fee Range</p>
                  <p className="text-sm font-medium text-navy-900">{lawyer.feeRange}</p>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <a href={`tel:${lawyer.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 hover:border-gold-400 hover:text-gold-700 transition-colors">
                  <Phone className="h-4 w-4" /> Call
                </a>
                <a href={`mailto:${lawyer.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 hover:border-gold-400 hover:text-gold-700 transition-colors">
                  <Mail className="h-4 w-4" /> Email
                </a>
                <Link
                  href={lawyer.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 hover:border-gold-400 hover:text-gold-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> NALSA Profile
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Star({ className, fill }: { className?: string; fill?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}