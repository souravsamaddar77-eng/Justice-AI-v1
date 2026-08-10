"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  UserRound,
  MessageSquare,
  Linkedin,
  Mail,
  MapPin,
  Briefcase,
  Star,
  CheckCircle,
  Plus,
  Loader2,
  Search,
  Filter,
  MoreHorizontal,
  Building2,
  Award,
  BookOpen,
  Users,
} from "lucide-react";
import Link from "next/link";

interface LawyerProfile {
  id: string;
  name: string;
  headline: string;
  specialization: string[];
  experience: number;
  location: string;
  court: string;
  avatar: string;
  coverImage: string;
  connections: number;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  about: string;
  education: { degree: string; institution: string; year: string }[];
  positions: { title: string; organization: string; duration: string; description: string }[];
  skills: string[];
  languages: string[];
  barRegistration: string;
  notableCases?: string[];
}

const MOCK_LAWYERS: LawyerProfile[] = [
  {
    id: "law-1",
    name: "Adv. Meera Krishnan",
    headline: "Senior Advocate | Supreme Court & High Courts | Constitutional & Administrative Law",
    specialization: ["Constitutional Law", "Administrative Law", "Public Interest Litigation", "Service Matters"],
    experience: 22,
    location: "New Delhi",
    court: "Supreme Court of India",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera&backgroundColor=1e3a5f&backgroundType=solid",
    coverImage: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=200&fit=crop",
    connections: 1247,
    verified: true,
    rating: 4.9,
    reviewsCount: 89,
    about: "Senior Advocate with 22+ years of experience appearing before the Supreme Court of India and various High Courts. Specialized in constitutional law, administrative law, and public interest litigation. Has argued landmark cases on fundamental rights, environmental law, and governance. Former Additional Solicitor General of India.",
    education: [
      { degree: "LL.M.", institution: "Harvard Law School", year: "2000" },
      { degree: "LL.B.", institution: "Campus Law Centre, DU", year: "1998" },
      { degree: "B.A. (Hons) Political Science", institution: "St. Stephen's College, DU", year: "1995" },
    ],
    positions: [
      { title: "Senior Advocate", organization: "Supreme Court of India", duration: "2015 — Present", description: "Designated Senior Advocate. Appears in constitutional matters, PILs, and administrative law cases." },
      { title: "Additional Solicitor General", organization: "Government of India", duration: "2012 — 2015", description: "Represented Union of India in Supreme Court and High Courts." },
      { title: "Advocate", organization: "Delhi High Court", duration: "1999 — 2012", description: "Civil, constitutional, and service law practice." },
    ],
    skills: ["Constitutional Law", "Administrative Law", "PIL", "Judicial Review", "Service Law", "Environmental Law", "Human Rights", "Statutory Interpretation"],
    languages: ["English", "Hindi", "Tamil"],
    barRegistration: "D/1245/1999",
    notableCases: ["K.S. Puttaswamy v. Union of India (Privacy)", "Shayara Bano v. Union of India (Triple Talaq)", "Internet Freedom Foundation v. Union of India (Internet Shutdowns)"],
  },
  {
    id: "law-2",
    name: "Adv. Rajesh Menon",
    headline: "Partner, Menon & Associates | Corporate Law | M&A | Securities | Insolvency",
    specialization: ["Corporate Law", "Mergers & Acquisitions", "Securities Law", "Insolvency & Bankruptcy"],
    experience: 18,
    location: "Mumbai",
    court: "Bombay High Court / NCLT",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh&backgroundColor=1e3a5f&backgroundType=solid",
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=200&fit=crop",
    connections: 892,
    verified: true,
    rating: 4.8,
    reviewsCount: 67,
    about: "Corporate law specialist with 18 years of experience advising on M&A transactions, securities offerings, and insolvency resolutions. Represents domestic and international clients before NCLT, NCLAT, SEBI, and High Courts. Regularly advises on Companies Act, SEBI regulations, and IBC matters.",
    education: [
      { degree: "LL.M. Corporate Law", institution: "NYU School of Law", year: "2005" },
      { degree: "LL.B.", institution: "Government Law College, Mumbai", year: "2003" },
      { degree: "B.Com", institution: "Sydenham College, Mumbai", year: "2000" },
    ],
    positions: [
      { title: "Partner", organization: "Menon & Associates", duration: "2014 — Present", description: "Leads corporate and M&A practice. Advises on cross-border transactions, PE/VC investments." },
      { title: "Senior Associate", organization: "Cyril Amarchand Mangaldas", duration: "2007 — 2014", description: "M&A, private equity, and securities law." },
      { title: "Associate", organization: "AZB & Partners", duration: "2004 — 2007", description: "Corporate advisory and compliance." },
    ],
    skills: ["M&A", "Private Equity", "Securities Law", "IBC", "Corporate Governance", "SEBI Regulations", "FEMA", "Competition Law"],
    languages: ["English", "Hindi", "Malayalam"],
    barRegistration: "MAH/3456/2003",
    notableCases: ["Essar Steel Insolvency", "DHFL Resolution Process", "Multiple cross-border M&A deals"],
  },
  {
    id: "law-3",
    name: "Adv. Priya Nair",
    headline: "Criminal Law Specialist | Sessions Court & High Court | Bail | White Collar Crime",
    specialization: ["Criminal Law", "Bail Matters", "White Collar Crime", "NDPS", "POCSO", "Cyber Crime"],
    experience: 14,
    location: "Bengaluru",
    court: "Karnataka High Court / Sessions Courts",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya&backgroundColor=1e3a5f&backgroundType=solid",
    coverImage: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=200&fit=crop",
    connections: 634,
    verified: true,
    rating: 4.7,
    reviewsCount: 112,
    about: "Criminal defense lawyer with 14+ years of experience in trial courts, High Court, and Supreme Court. Expertise in bail applications (anticipatory, regular), white-collar crime, NDPS, POCSO, and cyber crime cases. Known for strategic defense in complex economic offenses and digital evidence matters.",
    education: [
      { degree: "LL.M. Criminal Law", institution: "National Law School of India University", year: "2009" },
      { degree: "LL.B.", institution: "University Law College, Bangalore", year: "2007" },
    ],
    positions: [
      { title: "Senior Counsel", organization: "Nair Law Chambers", duration: "2016 — Present", description: "Independent criminal practice. High Court and Supreme Court appearances." },
      { title: "Associate", organization: "M/s Rao & Associates", duration: "2008 — 2016", description: "Criminal trials, bail applications, revision petitions." },
    ],
    skills: ["Criminal Trial", "Bail Applications", "White Collar Crime", "NDPS", "POCSO", "Cyber Crime", "Digital Evidence", "Cross-examination"],
    languages: ["English", "Hindi", "Kannada", "Malayalam"],
    barRegistration: "KAR/2178/2007",
    notableCases: ["High-profile economic offense bail matters", "Cyber crime cases under IT Act", "NDPS commercial quantity defenses"],
  },
  {
    id: "law-4",
    name: "Adv. Arjun Patel",
    headline: "Family Law & Matrimonial Expert | Divorce | Custody | Maintenance | Property",
    specialization: ["Family Law", "Divorce", "Child Custody", "Maintenance", "Domestic Violence", "Property Division"],
    experience: 16,
    location: "Ahmedabad",
    court: "Gujarat High Court / Family Courts",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun&backgroundColor=1e3a5f&backgroundType=solid",
    coverImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=200&fit=crop",
    connections: 521,
    verified: true,
    rating: 4.9,
    reviewsCount: 156,
    about: "Family law practitioner with 16 years of exclusive focus on matrimonial disputes. Handles contested divorces, mutual consent divorces, child custody battles, maintenance (Section 125 CrPC/BNSS), domestic violence cases, and property disputes. Empathetic approach with strong courtroom advocacy.",
    education: [
      { degree: "LL.M. Family Law", institution: "Gujarat National Law University", year: "2007" },
      { degree: "LL.B.", institution: "Sir L.A. Shah Law College, Ahmedabad", year: "2005" },
    ],
    positions: [
      { title: "Founding Partner", organization: "Patel & Associates", duration: "2012 — Present", description: "Exclusive family law practice. 500+ matrimonial cases handled." },
      { title: "Junior Counsel", organization: "Desai Law Firm", duration: "2005 — 2012", description: "Civil and family law matters." },
    ],
    skills: ["Divorce Law", "Child Custody", "Maintenance", "Domestic Violence Act", "Hindu Marriage Act", "Special Marriage Act", "Property Settlement", "Mediation"],
    languages: ["English", "Hindi", "Gujarati"],
    barRegistration: "G/1890/2005",
    notableCases: ["Landmark custody judgment (Gujarat HC)", "High-net-worth divorce settlements", "Domestic violence protection orders"],
  },
  {
    id: "law-5",
    name: "Adv. Sneha Reddy",
    headline: "IPR & Technology Law | Patents | Trademarks | Copyright | Data Protection",
    specialization: ["Intellectual Property", "Patents", "Trademarks", "Copyright", "Data Privacy", "Technology Contracts"],
    experience: 12,
    location: "Hyderabad",
    court: "Telangana High Court / IPAB / Commercial Courts",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha&backgroundColor=1e3a5f&backgroundType=solid",
    coverImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=200&fit=crop",
    connections: 445,
    verified: true,
    rating: 4.8,
    reviewsCount: 73,
    about: "IPR and technology law specialist advising startups, MNCs, and research institutions. Handles patent prosecution, trademark opposition, copyright infringement, and data protection compliance (DPDP Act). Represents clients in commercial courts, High Courts, and IP Appellate Board.",
    education: [
      { degree: "LL.M. IPR", institution: "Queen Mary University of London", year: "2011" },
      { degree: "B.Tech. Computer Science", institution: "IIT Hyderabad", year: "2009" },
      { degree: "LL.B.", institution: "NALSAR University of Law", year: "2012" },
    ],
    positions: [
      { title: "Partner", organization: "Reddy IP Associates", duration: "2018 — Present", description: "Full-service IP practice. Patent filing, trademark prosecution, IP litigation." },
      { title: "IP Counsel", organization: "TechMahindra", duration: "2013 — 2018", description: "In-house IP management, patent portfolio, licensing." },
    ],
    skills: ["Patent Law", "Trademark Law", "Copyright", "Designs Act", "DPDP Act", "IT Act", "Technology Agreements", "IP Litigation"],
    languages: ["English", "Hindi", "Telugu"],
    barRegistration: "TS/1456/2012",
    notableCases: ["Standard Essential Patents (SEP) licensing", "Pharmaceutical patent oppositions", "Trademark passing off suits"],
  },
  {
    id: "law-6",
    name: "Adv. Vikram Singh",
    headline: "Tax & Commercial Litigation | GST | Income Tax | Customs | Arbitration",
    specialization: ["Tax Law", "GST", "Income Tax", "Customs", "Commercial Arbitration", "FEMA"],
    experience: 20,
    location: "New Delhi",
    court: "Supreme Court / High Courts / CESTAT / ITAT / Arbitration Tribunals",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram&backgroundColor=1e3a5f&backgroundType=solid",
    coverImage: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=200&fit=crop",
    connections: 1103,
    verified: true,
    rating: 4.9,
    reviewsCount: 94,
    about: "Tax and commercial litigation veteran with 20 years of experience across direct and indirect tax disputes. Appears before Supreme Court, High Courts, CESTAT, ITAT, and international arbitration tribunals. Advises on GST compliance, transfer pricing, tax planning, and cross-border transactions.",
    education: [
      { degree: "LL.M. Taxation", institution: "University of Delhi", year: "2003" },
      { degree: "LL.B.", institution: "Campus Law Centre, DU", year: "2001" },
      { degree: "B.Com (Hons)", institution: "Shri Ram College of Commerce", year: "1998" },
    ],
    positions: [
      { title: "Senior Advocate", organization: "Singh Tax Chambers", duration: "2018 — Present", description: "Supreme Court and High Court tax litigation. International arbitration." },
      { title: "Advocate", organization: "Delhi High Court", duration: "2002 — 2018", description: "Income Tax, Service Tax, Customs, GST matters." },
    ],
    skills: ["Income Tax", "GST", "Customs", "Transfer Pricing", "International Tax", "Arbitration", "FEMA", "Tax Treaties"],
    languages: ["English", "Hindi", "Punjabi"],
    barRegistration: "D/890/2001",
    notableCases: ["GST constitutional challenges", "Transfer pricing adjustments (Supreme Court)", "Retrospective tax amendment cases"],
  },
];

export default function NetworkPage() {
  const [lawyers, setLawyers] = useState<LawyerProfile[]>(MOCK_LAWYERS.slice(0, 3));
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const allSpecializations = Array.from(new Set(MOCK_LAWYERS.flatMap(l => l.specialization))).sort();
  const allLocations = Array.from(new Set(MOCK_LAWYERS.map(l => l.location))).sort();

  const filteredLawyers = MOCK_LAWYERS.filter(lawyer => {
    if (searchQuery && !lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !lawyer.headline.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !lawyer.specialization.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    if (specializationFilter && !lawyer.specialization.includes(specializationFilter)) return false;
    if (locationFilter && lawyer.location !== locationFilter) return false;
    return true;
  });

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    setTimeout(() => {
      const nextBatch = filteredLawyers.slice(lawyers.length, lawyers.length + 3);
      setLawyers(prev => [...prev, ...nextBatch]);
      setLoading(false);
      if (lawyers.length + nextBatch.length >= filteredLawyers.length) {
        setHasMore(false);
      }
    }, 800);
  }, [lawyers.length, filteredLawyers.length, loading, hasMore]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  useEffect(() => {
    setLawyers(filteredLawyers.slice(0, 3));
    setHasMore(filteredLawyers.length > 3);
  }, [filteredLawyers]);

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Advocate Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold">
            <Users className="h-9 w-9 text-gold-300" />
            Lawyer Network
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Connect with verified advocates across India. Browse profiles by specialization, location, and experience.
            Build your professional network for referrals, co-counsel, and knowledge sharing.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Filters */}
        <div className="card-surface p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, specialization, keywords..."
                className="input pl-10 w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={specializationFilter}
                onChange={e => setSpecializationFilter(e.target.value)}
                className="input min-w-[200px]"
              >
                <option value="">All Specializations</option>
                {allSpecializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="input min-w-[160px]"
              >
                <option value="">All Locations</option>
                {allLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="mb-4 text-sm text-navy-600">
          Showing {lawyers.length} of {filteredLawyers.length} advocates
        </p>

        {/* Lawyer Feed */}
        <div className="space-y-6">
          {lawyers.map(lawyer => (
            <LawyerCard key={lawyer.id} lawyer={lawyer} />
          ))}
        </div>

        {/* Infinite Scroll Trigger */}
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {loading && <Loader2 className="h-8 w-8 animate-spin text-gold-500" />}
          {hasMore && !loading && <p className="text-sm text-navy-500">Scroll to load more...</p>}
          {!hasMore && lawyers.length > 0 && <p className="text-sm text-navy-500">End of results</p>}
        </div>

        {/* Empty State */}
        {filteredLawyers.length === 0 && (
          <div className="card-surface p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-navy-300 mb-4" />
            <h3 className="text-lg font-semibold text-navy-900 mb-2">No advocates found</h3>
            <p className="text-navy-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LawyerCard({ lawyer }: { lawyer: LawyerProfile }) {
  return (
    <div className="card-surface rounded-2xl overflow-hidden hover:border-gold-300/50 hover:shadow-xl transition-all">
      {/* Cover Image */}
      <div className="relative h-32 sm:h-40">
        <img
          src={lawyer.coverImage}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <img
              src={lawyer.avatar}
              alt={lawyer.name}
              className="h-20 w-20 rounded-full border-4 border-white shadow-lg"
            />
            <div className="text-white">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{lawyer.name}</h3>
                {lawyer.verified && (
                  <CheckCircle className="h-5 w-5 text-gold-400" />
                )}
              </div>
              <p className="text-sm text-navy-200">{lawyer.headline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-primary flex items-center gap-2 px-4 py-2">
              <Plus className="h-4 w-4" /> Connect
            </button>
            <button className="btn-secondary p-2" aria-label="More options">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-navy-600">
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" /> {lawyer.experience}+ years exp
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {lawyer.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" /> {lawyer.court}
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-current text-gold-500" /> {lawyer.rating} ({lawyer.reviewsCount})
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> {lawyer.connections}+ connections
          </span>
        </div>

        {/* Specializations */}
        <div className="flex flex-wrap gap-2">
          {lawyer.specialization.slice(0, 4).map(spec => (
            <span key={spec} className="rounded-full bg-gold-50 px-2.5 py-1 text-sm font-medium text-gold-700">
              {spec}
            </span>
          ))}
          {lawyer.specialization.length > 4 && (
            <span className="rounded-full bg-navy-100 px-2.5 py-1 text-sm text-navy-600">
              +{lawyer.specialization.length - 4} more
            </span>
          )}
        </div>

        {/* About Preview */}
        <p className="text-sm text-navy-700 line-clamp-2">{lawyer.about}</p>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-navy-100">
          <Link
            href={`/advocate/network/${lawyer.id}`}
            className="btn-secondary flex-1 text-center text-sm"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </Link>
          <a
            href={`https://linkedin.com/in/${lawyer.name.toLowerCase().replace(/\s+/g, "-")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex-1 text-center text-sm flex items-center justify-center gap-1.5"
          >
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
          </a>
          <a
            href={`mailto:${lawyer.name.toLowerCase().replace(/\s+/g, ".")}@lawfirm.example.com`}
            className="btn-secondary flex-1 text-center text-sm flex items-center justify-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
        </div>
      </div>
    </div>
  );
}