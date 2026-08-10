"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Gavel,
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  ExternalLink,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  Tag,
  Star,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";

interface Judgment {
  id: string;
  title: string;
  court: string;
  date: string;
  citation: string;
  bench?: string;
  judge?: string;
  summary: string;
  url: string;
  tags: string[];
  relevanceScore?: number;
}

interface LawEntry {
  id: string;
  name: string;
  actNumber: string;
  year: number;
  ministry: string;
  description: string;
  url: string;
  sections: number;
  lastAmended?: string;
}

interface FeedItem {
  id: string;
  title: string;
  court: string;
  date: string;
  url: string;
  snippet: string;
}

const MOCK_JUDGMENTS: Judgment[] = [
  {
    id: "jud-1",
    title: "K.S. Puttaswamy v. Union of India",
    court: "Supreme Court of India",
    date: "2017-08-24",
    citation: "(2017) 10 SCC 1",
    bench: "9-Judge Bench",
    judge: "J.S. Khehar, CJI",
    summary: "Landmark judgment recognizing right to privacy as a fundamental right under Article 21. Overruled MP Sharma and Kharak Singh. Established triple test for privacy restrictions: legality, necessity, proportionality.",
    url: "https://indiankanoon.org/doc/127517806/",
    tags: ["privacy", "fundamental-rights", "article-21", "constitutional-law", "landmark"],
  },
  {
    id: "jud-2",
    title: "Shayara Bano v. Union of India",
    court: "Supreme Court of India",
    date: "2017-08-22",
    citation: "(2017) 9 SCC 1",
    bench: "5-Judge Bench",
    judge: "J.S. Khehar, CJI",
    summary: "Declared instant triple talaq (talaq-e-biddat) unconstitutional. Held it violates Article 14 (equality) and is not protected under Article 25 (religious freedom). Led to Muslim Women (Protection of Rights on Marriage) Act, 2019.",
    url: "https://indiankanoon.org/doc/107461586/",
    tags: ["family-law", "triple-talaq", "article-14", "article-25", "constitutional-law", "landmark"],
  },
  {
    id: "jud-3",
    title: "Navtej Singh Johar v. Union of India",
    court: "Supreme Court of India",
    date: "2018-09-06",
    citation: "(2018) 10 SCC 1",
    bench: "5-Judge Bench",
    judge: "Dipak Misra, CJI",
    summary: "Decriminalized consensual homosexual acts between adults by reading down Section 377 IPC. Affirmed dignity, privacy, and equality for LGBTQ+ community. Overruled Suresh Kumar Koushal.",
    url: "https://indiankanoon.org/doc/110587239/",
    tags: ["lgbtq-rights", "section-377", "article-14", "article-15", "article-21", "constitutional-law", "landmark"],
  },
  {
    id: "jud-4",
    title: "Joseph Shine v. Union of India",
    court: "Supreme Court of India",
    date: "2018-09-27",
    citation: "(2019) 3 SCC 39",
    bench: "5-Judge Bench",
    judge: "Dipak Misra, CJI",
    summary: "Struck down Section 497 IPC (adultery) as unconstitutional. Held it violates Articles 14, 15, and 21. Also struck down Section 198(2) CrPC. Adultery remains ground for divorce but not criminal offence.",
    url: "https://indiankanoon.org/doc/133789124/",
    tags: ["adultery", "section-497", "article-14", "article-15", "article-21", "criminal-law", "landmark"],
  },
  {
    id: "jud-5",
    title: "Internet Freedom Foundation v. Union of India",
    court: "Supreme Court of India",
    date: "2020-01-10",
    citation: "(2020) 3 SCC 710",
    bench: "3-Judge Bench",
    judge: "N.V. Ramana, J.",
    summary: "Anuradha Bhasin case - laid down procedural safeguards for internet shutdowns. Orders must be published, proportional, necessary, and subject to judicial review. Indefinite shutdowns impermissible.",
    url: "https://indiankanoon.org/doc/135478921/",
    tags: ["internet-shutdown", "article-19", "freedom-of-speech", "proportionality", "constitutional-law"],
  },
  {
    id: "jud-6",
    title: "Karnataka High Court v. State of Karnataka",
    court: "Karnataka High Court",
    date: "2022-03-15",
    citation: "WP 7467/2022",
    bench: "Division Bench",
    judge: "Ritu Raj Awasthi, CJ",
    summary: "Hijab ban case - upheld restriction on hijab in educational institutions with prescribed uniforms. Held wearing hijab not essential religious practice under Article 25. Pending before Supreme Court.",
    url: "https://indiankanoon.org/doc/158723456/",
    tags: ["hijab", "article-25", "education", "essential-practice", "high-court"],
  },
  {
    id: "jud-7",
    title: "Vijay Madanlal Choudhary v. Union of India",
    court: "Supreme Court of India",
    date: "2022-07-27",
    citation: "(2022) 8 SCC 1",
    bench: "3-Judge Bench",
    judge: "A.M. Khanwilkar, J.",
    summary: "Upheld constitutional validity of PMLA provisions including arrest (S.19), attachment (S.5), search (S.17), and burden of proof reversal (S.24). Clarified ED powers are not unbridled.",
    url: "https://indiankanoon.org/doc/172345678/",
    tags: ["pmla", "money-laundering", "ed-powers", "arrest", "attachment", "criminal-law"],
  },
  {
    id: "jud-8",
    title: "X v. Principal Secretary, Health Dept.",
    court: "Supreme Court of India",
    date: "2022-09-29",
    citation: "(2022) 11 SCC 1",
    bench: "3-Judge Bench",
    judge: "D.Y. Chandrachud, J.",
    summary: "Expanded abortion rights under MTP Act. Unmarried women entitled to abortion up to 24 weeks. Marital rape exception in MTP Act unconstitutional. Reproductive autonomy under Article 21.",
    url: "https://indiankanoon.org/doc/185672341/",
    tags: ["abortion", "mtp-act", "reproductive-rights", "article-21", "women-rights", "marital-rape"],
  },
  {
    id: "jud-9",
    title: "Supreme Court Advocates-on-Record v. Union of India",
    court: "Supreme Court of India",
    date: "2023-10-16",
    citation: "(2023) 10 SCC 1",
    bench: "5-Judge Bench",
    judge: "D.Y. Chandrachud, CJI",
    summary: "NJAC case - struck down 99th Amendment and NJAC Act. Restored collegium system for judicial appointments. Judiciary independence is basic structure. Memorandum of Procedure to be finalized.",
    url: "https://indiankanoon.org/doc/198765432/",
    tags: ["njac", "judicial-appointments", "collegium", "basic-structure", "constitutional-law", "landmark"],
  },
  {
    id: "jud-10",
    title: "Satender Kumar Antil v. CBI",
    court: "Supreme Court of India",
    date: "2022-07-11",
    citation: "(2022) 10 SCC 51",
    bench: "2-Judge Bench",
    judge: "S.K. Kaul, J.",
    summary: "Laid down comprehensive guidelines for arrest under CrPC/BNSS. Section 41/35 checklist mandatory. Bail not jail principle reinforced. Separate bail law recommended.",
    url: "https://indiankanoon.org/doc/171234567/",
    tags: ["arrest", "bail", "crpc", "bnss", "section-41", "criminal-procedure", "guidelines"],
  },
  {
    id: "jud-11",
    title: "M/S PLR Projects v. Mahanadi Coalfields",
    court: "Supreme Court of India",
    date: "2023-02-28",
    citation: "(2023) 4 SCC 1",
    bench: "2-Judge Bench",
    judge: "M.R. Shah, J.",
    summary: "Clarified law on unilateral termination of contracts. Public sector undertakings cannot terminate arbitrarily. Principles of natural justice and fairness apply even in commercial contracts.",
    url: "https://indiankanoon.org/doc/191234567/",
    tags: ["contract-law", "termination", "psu", "natural-justice", "arbitrariness", "article-14"],
  },
  {
    id: "jud-12",
    title: "State of Maharashtra v. Indian Hotel & Restaurant Association",
    court: "Supreme Court of India",
    date: "2024-01-15",
    citation: "(2024) 2 SCC 1",
    bench: "3-Judge Bench",
    judge: "B.R. Gavai, J.",
    summary: "Dance bar regulation case - struck down total ban on dance bars in Maharashtra. Regulation must be reasonable, not prohibitive. Livelihood protection under Article 19(1)(g).",
    url: "https://indiankanoon.org/doc/201234567/",
    tags: ["dance-bar", "article-19", "livelihood", "regulation", "proportionality", "maharashtra"],
  },
];

const MOCK_LAWS: LawEntry[] = [
  {
    id: "law-1",
    name: "Bharatiya Nyaya Sanhita, 2023",
    actNumber: "45",
    year: 2023,
    ministry: "Ministry of Home Affairs",
    description: "Replaces the Indian Penal Code, 1860. 358 sections (reduced from 511). New offences: organized crime, terrorism, mob lynching, hit-and-run. Community service as punishment.",
    url: "https://indiankanoon.org/browselaws/act/2023/45",
    sections: 358,
    lastAmended: "2023-12-25",
  },
  {
    id: "law-2",
    name: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    actNumber: "46",
    year: 2023,
    ministry: "Ministry of Home Affairs",
    description: "Replaces CrPC, 1973. 531 sections. Key changes: zero FIR, electronic evidence, timelines for investigation/trial, bail reforms, victim compensation, witness protection.",
    url: "https://indiankanoon.org/browselaws/act/2023/46",
    sections: 531,
    lastAmended: "2023-12-25",
  },
  {
    id: "law-3",
    name: "Bharatiya Sakshya Adhiniyam, 2023",
    actNumber: "47",
    year: 2023,
    ministry: "Ministry of Home Affairs",
    description: "Replaces Indian Evidence Act, 1872. 170 sections. Electronic records as primary evidence, digital signatures, server certificates, expanded secondary evidence rules.",
    url: "https://indiankanoon.org/browselaws/act/2023/47",
    sections: 170,
    lastAmended: "2023-12-25",
  },
  {
    id: "law-4",
    name: "Constitution of India",
    actNumber: "Const.",
    year: 1950,
    ministry: "Constituent Assembly",
    description: "Supreme law of India. 448 articles, 25 parts, 12 schedules. Fundamental rights (Part III), Directive principles (Part IV), Federal structure, Amendment procedure (Art. 368).",
    url: "https://indiankanoon.org/browselaws/constitution",
    sections: 448,
  },
  {
    id: "law-5",
    name: "Code of Civil Procedure, 1908",
    actNumber: "5",
    year: 1908,
    ministry: "Legislative Department",
    description: "Procedure for civil suits. 158 sections, 51 orders. Jurisdiction, res judicata, pleadings, discovery, trial, appeals, execution, revision, review.",
    url: "https://indiankanoon.org/browselaws/act/1908/5",
    sections: 158,
    lastAmended: "2023-08-11",
  },
  {
    id: "law-6",
    name: "Indian Contract Act, 1872",
    actNumber: "9",
    year: 1872,
    ministry: "Legislative Department",
    description: "General principles of contract law. 266 sections. Offer, acceptance, consideration, capacity, free consent, void/voidable contracts, breach, damages (S.73), quasi-contracts.",
    url: "https://indiankanoon.org/browselaws/act/1872/9",
    sections: 266,
    lastAmended: "2020-03-20",
  },
  {
    id: "law-7",
    name: "Specific Relief Act, 1963",
    actNumber: "47",
    year: 1963,
    ministry: "Legislative Department",
    description: "Specific performance, injunctions, rectification, rescission, declaratory decrees. 44 sections. 2018 amendment made specific performance the rule, not exception.",
    url: "https://indiankanoon.org/browselaws/act/1963/47",
    sections: 44,
    lastAmended: "2018-10-01",
  },
  {
    id: "law-8",
    name: "Arbitration and Conciliation Act, 1996",
    actNumber: "26",
    year: 1996,
    ministry: "Legislative Department",
    description: "Domestic and international arbitration, enforcement of foreign awards, conciliation. 86 sections. 2015, 2019, 2021 amendments - timelines, institutional arbitration, emergency arbitrator.",
    url: "https://indiankanoon.org/browselaws/act/1996/26",
    sections: 86,
    lastAmended: "2021-03-10",
  },
  {
    id: "law-9",
    name: "Companies Act, 2013",
    actNumber: "18",
    year: 2013,
    ministry: "Ministry of Corporate Affairs",
    description: "Corporate law framework. 470 sections, 7 schedules. Incorporation, governance, CSR, NCLT/NCLAT, mergers, oppression & mismanagement, winding up.",
    url: "https://indiankanoon.org/browselaws/act/2013/18",
    sections: 470,
    lastAmended: "2022-02-15",
  },
  {
    id: "law-10",
    name: "Consumer Protection Act, 2019",
    actNumber: "35",
    year: 2019,
    ministry: "Ministry of Consumer Affairs",
    description: "Replaces 1986 Act. Central Consumer Protection Authority, product liability, e-commerce, unfair contracts, mediation, penalties. 101 sections.",
    url: "https://indiankanoon.org/browselaws/act/2019/35",
    sections: 101,
    lastAmended: "2020-07-20",
  },
  {
    id: "law-11",
    name: "Prevention of Money Laundering Act, 2002",
    actNumber: "15",
    year: 2002,
    ministry: "Ministry of Finance",
    description: "Anti-money laundering framework. ED powers: arrest, attachment, search, burden of proof reversal. 84 sections. 2019, 2022 amendments expanded scope.",
    url: "https://indiankanoon.org/browselaws/act/2002/15",
    sections: 84,
    lastAmended: "2022-11-09",
  },
  {
    id: "law-12",
    name: "Insolvency and Bankruptcy Code, 2016",
    actNumber: "31",
    year: 2016,
    ministry: "Ministry of Corporate Affairs",
    description: "Time-bound insolvency resolution. NCLT/NCLAT, IBBI, resolution professionals, CIRP, liquidation, cross-border insolvency. 255 sections.",
    url: "https://indiankanoon.org/browselaws/act/2016/31",
    sections: 255,
    lastAmended: "2022-08-11",
  },
];

const MOCK_FEED: FeedItem[] = [
  {
    id: "feed-1",
    title: "State of Karnataka v. Union of India",
    court: "Supreme Court",
    date: "2026-08-05",
    url: "https://indiankanoon.org/doc/234567891/",
    snippet: "Inter-state water dispute - Cauvery water sharing. Modified tribunal award. Equitable apportionment principle applied.",
  },
  {
    id: "feed-2",
    title: "Rajesh Kumar v. State of UP",
    court: "Allahabad High Court",
    date: "2026-08-04",
    url: "https://indiankanoon.org/doc/234567892/",
    snippet: "Bail under Section 439 BNSS - delay in trial as ground. Accused incarcerated for 3+ years. Bail granted with conditions.",
  },
  {
    id: "feed-3",
    title: "M/S Sharma Enterprises v. Municipal Corporation",
    court: "Delhi High Court",
    date: "2026-08-04",
    url: "https://indiankanoon.org/doc/234567893/",
    snippet: "Arbitration under Section 34 - challenge to arbitral award. Public policy ground narrowly construed. Award upheld.",
  },
  {
    id: "feed-4",
    title: "Priya Singh v. State of Maharashtra",
    court: "Bombay High Court",
    date: "2026-08-03",
    url: "https://indiankanoon.org/doc/234567894/",
    snippet: "Domestic violence under Section 12 PWDVA - interim protection order. Husband directed to vacate shared household.",
  },
  {
    id: "feed-5",
    title: "Income Tax Dept. v. M/S TechCorp",
    court: "Supreme Court",
    date: "2026-08-02",
    url: "https://indiankanoon.org/doc/234567895/",
    snippet: "Section 68 ITA - unexplained cash credits. Beneficial owner identification required. Addition deleted for lack of evidence.",
  },
  {
    id: "feed-6",
    title: "Workers Union v. Factory Management",
    court: "Karnataka High Court",
    date: "2026-08-02",
    url: "https://indiankanoon.org/doc/234567896/",
    snippet: "Industrial dispute - illegal retrenchment. Section 25F ID Act compliance mandatory. Reinstatement with back wages ordered.",
  },
  {
    id: "feed-7",
    title: "Environmental NGO v. State Pollution Board",
    court: "NGT Principal Bench",
    date: "2026-08-01",
    url: "https://indiankanoon.org/doc/234567897/",
    snippet: "Environmental clearance violation. Precautionary principle applied. Project stayed pending fresh EIA.",
  },
  {
    id: "feed-8",
    title: "Patent Infringement: PharmaCorp v. GenericMeds",
    court: "Delhi High Court",
    date: "2026-08-01",
    url: "https://indiankanoon.org/doc/234567898/",
    snippet: "Section 48 Patents Act - interim injunction denied. Balance of convenience favors generic manufacturer. Public interest considered.",
  },
  {
    id: "feed-9",
    title: "Cyber Crime: State v. Anonymous Hacker",
    court: "Mumbai Sessions Court",
    date: "2026-07-31",
    url: "https://indiankanoon.org/doc/234567899/",
    snippet: "Section 66C/66D IT Act - identity theft and cheating. Digital evidence authenticated under Section 65B BSA. Conviction upheld.",
  },
  {
    id: "feed-10",
    title: "Matrimonial: Anjali v. Rohit",
    court: "Family Court, Delhi",
    date: "2026-07-31",
    url: "https://indiankanoon.org/doc/234567900/",
    snippet: "Divorce under Section 13B HMA - mutual consent. 6-month cooling off waived. Parties settled alimony and custody.",
  },
];

export default function PrecedentsPage() {
  const [activeTab, setActiveTab] = useState<"judgments" | "laws" | "feed">("judgments");
  const [searchQuery, setSearchQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const filteredJudgments = MOCK_JUDGMENTS.filter(j => {
    if (searchQuery && !j.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !j.summary.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !j.citation.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (courtFilter && !j.court.toLowerCase().includes(courtFilter.toLowerCase())) return false;
    if (yearFilter && !j.date.startsWith(yearFilter)) return false;
    if (tagFilter && !j.tags.includes(tagFilter)) return false;
    return true;
  });

  const filteredLaws = MOCK_LAWS.filter(l => {
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !l.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !l.actNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (yearFilter && l.year.toString() !== yearFilter) return false;
    return true;
  });

  const filteredFeed = MOCK_FEED.filter(f => {
    if (searchQuery && !f.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !f.snippet.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (courtFilter && !f.court.toLowerCase().includes(courtFilter.toLowerCase())) return false;
    return true;
  });

  const allTags = Array.from(new Set(MOCK_JUDGMENTS.flatMap(j => j.tags))).sort();
  const allCourts = Array.from(new Set(MOCK_JUDGMENTS.map(j => j.court))).sort();
  const allYears = Array.from(new Set(MOCK_JUDGMENTS.map(j => j.date.slice(0, 4)))).sort().reverse();

  const paginatedJudgments = filteredJudgments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedLaws = filteredLaws.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedFeed = filteredFeed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = Math.ceil(
    (activeTab === "judgments" ? filteredJudgments.length :
     activeTab === "laws" ? filteredLaws.length :
     filteredFeed.length) / itemsPerPage
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Advocate Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold">
            <Gavel className="h-9 w-9 text-gold-300" />
            Precedents & Judgments
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Three-way access to Indian legal research — Browse landmark judgments, statutes & bare acts,
            and real-time judgment feeds. Data sourced from Indian Kanoon.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-navy-200">
          <nav className="flex gap-1" aria-label="Precedent tabs">
            <TabButton
              active={activeTab === "judgments"}
              onClick={() => { setActiveTab("judgments"); setCurrentPage(1); }}
              icon={<BookOpen className="h-4 w-4" />}
              label="Browse Judgments"
              count={filteredJudgments.length}
              href="https://indiankanoon.org/browse/"
            />
            <TabButton
              active={activeTab === "laws"}
              onClick={() => { setActiveTab("laws"); setCurrentPage(1); }}
              icon={<FileText className="h-4 w-4" />}
              label="Browse Laws"
              count={filteredLaws.length}
              href="https://indiankanoon.org/browselaws/"
            />
            <TabButton
              active={activeTab === "feed"}
              onClick={() => { setActiveTab("feed"); setCurrentPage(1); }}
              icon={<RefreshCw className="h-4 w-4" />}
              label="Recent Judgments"
              count={filteredFeed.length}
              href="https://indiankanoon.org/feeds/"
            />
          </nav>
        </div>

        {/* Search & Filters */}
        <div className="card-surface p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === "judgments" ? "Search judgments by title, citation, summary..." :
                              activeTab === "laws" ? "Search acts, sections, descriptions..." :
                              "Search recent judgments..."}
                className="input pl-10 pr-10 w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {(activeTab === "judgments" || activeTab === "feed") && (
              <div className="flex flex-wrap gap-2">
                {/* Judgments filters */}
                {activeTab === "judgments" && (
                  <>
                    <FilterSelect
                      label="Court"
                      value={courtFilter}
                      options={allCourts}
                      onChange={v => { setCourtFilter(v); setCurrentPage(1); }}
                      placeholder="All Courts"
                    />
                    <FilterSelect
                      label="Year"
                      value={yearFilter}
                      options={allYears}
                      onChange={v => { setYearFilter(v); setCurrentPage(1); }}
                      placeholder="All Years"
                    />
                    <FilterSelect
                      label="Tag"
                      value={tagFilter}
                      options={allTags}
                      onChange={v => { setTagFilter(v); setCurrentPage(1); }}
                      placeholder="All Tags"
                    />
                  </>
                )}

                {/* Feed filters */}
                {activeTab === "feed" && (
                  <FilterSelect
                    label="Court"
                    value={courtFilter}
                    options={Array.from(new Set(MOCK_FEED.map(f => f.court))).sort()}
                    onChange={v => { setCourtFilter(v); setCurrentPage(1); }}
                    placeholder="All Courts"
                  />
                )}
              </div>
            )}

            {/* Laws filters */}
            {activeTab === "laws" && (
              <div className="flex flex-wrap gap-2">
                <FilterSelect
                  label="Year"
                  value={yearFilter}
                  options={Array.from(new Set(MOCK_LAWS.map(l => l.year.toString()))).sort().reverse()}
                  onChange={v => { setYearFilter(v); setCurrentPage(1); }}
                  placeholder="All Years"
                />
              </div>
            )}

            {(searchQuery || courtFilter || yearFilter || tagFilter) && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setCourtFilter(""); setYearFilter(""); setTagFilter(""); setCurrentPage(1); }}
                className="btn-secondary whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </form>
        </div>

        {/* Content */}
        {activeTab === "judgments" && (
          <JudgmentsList
            judgments={paginatedJudgments}
            loading={loading}
            empty={filteredJudgments.length === 0}
          />
        )}

        {activeTab === "laws" && (
          <LawsList
            laws={paginatedLaws}
            loading={loading}
            empty={filteredLaws.length === 0}
          />
        )}

        {activeTab === "feed" && (
          <FeedList
            items={paginatedFeed}
            loading={loading}
            empty={filteredFeed.length === 0}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        {/* External Links */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ExternalLinkCard
            icon={<BookOpen className="h-6 w-6" />}
            title="Browse Judgments"
            desc="Full judgment database with advanced search, citations, and cross-references"
            href="https://indiankanoon.org/browse/"
            color="gold"
          />
          <ExternalLinkCard
            icon={<FileText className="h-6 w-6" />}
            title="Browse Laws"
            desc="Complete bare acts with section-wise navigation, amendments, and rules"
            href="https://indiankanoon.org/browselaws/"
            color="blue"
          />
          <ExternalLinkCard
            icon={<RefreshCw className="h-6 w-6" />}
            title="Recent Judgments Feed"
            desc="Real-time judgment feed from all courts with RSS/email alerts"
            href="https://indiankanoon.org/feeds/"
            color="emerald"
          />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count, href }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 ${active
        ? "border-gold-500 text-navy-900 bg-gold-50"
        : "border-transparent text-navy-500 hover:text-navy-700 hover:bg-navy-50"}`}
    >
      {Icon}
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? "bg-gold-500 text-navy-950" : "bg-navy-100 text-navy-600"}`}>
        {count}
      </span>
    </a>
  );
}

function FilterSelect({ label, value, options, onChange, placeholder }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input appearance-none pr-10 min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400 pointer-events-none" />
    </div>
  );
}

function JudgmentsList({ judgments, loading, empty }: { judgments: any[]; loading: boolean; empty: boolean }) {
  if (loading) return <LoadingState />;
  if (empty) return <EmptyState message="No judgments match your filters" icon={BookOpen} />;

  return (
    <div className="space-y-4">
      {judgments.map(judgment => (
        <JudgmentCard key={judgment.id} judgment={judgment} />
      ))}
    </div>
  );
}

function JudgmentCard({ judgment }: { judgment: Judgment }) {
  const date = new Date(judgment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const courts = {
    "Supreme Court of India": "SC",
    "Karnataka High Court": "KAR HC",
    "Delhi High Court": "DEL HC",
    "Bombay High Court": "BOM HC",
    "Allahabad High Court": "ALL HC",
  };

  return (
    <div className="card-surface p-5 hover:border-gold-300/50 hover:shadow-lg transition-all">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-shrink-0 w-full md:w-32 text-center md:text-left">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold-100 text-gold-600 mx-auto md:mx-0 mb-2 md:mb-0">
            <Gavel className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-navy-700 uppercase tracking-wider">{courts[judgment.court as keyof typeof courts] || "HC"}</p>
          <p className="text-xs text-navy-500">{date}</p>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-navy-900 line-clamp-2">{judgment.title}</h3>
          <p className="mt-1 text-sm text-navy-500">{judgment.citation}</p>
          {judgment.bench && <p className="text-xs text-navy-400">{judgment.bench}</p>}
          <p className="mt-2 text-sm text-navy-600 line-clamp-2">{judgment.summary}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {judgment.tags.slice(0, 4).map((tag: string) => (
              <span key={tag} className="rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-600">{tag}</span>
            ))}
            {judgment.tags.length > 4 && (
              <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-500">+{judgment.tags.length - 4}</span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 md:ml-auto mt-4 md:mt-0">
          <a
            href={judgment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-1.5 w-full md:w-auto justify-center"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on Indian Kanoon
          </a>
        </div>
      </div>
    </div>
  );
}

function LawsList({ laws, loading, empty }: { laws: any[]; loading: boolean; empty: boolean }) {
  if (loading) return <LoadingState />;
  if (empty) return <EmptyState message="No laws match your filters" icon={FileText} />;

  return (
    <div className="space-y-3">
      {laws.map(law => (
        <LawCard key={law.id} law={law} />
      ))}
    </div>
  );
}

function LawCard({ law }: { law: any }) {
  const isNew = law.year >= 2023;
  return (
    <div className="card-surface p-5 hover:border-gold-300/50 hover:shadow-lg transition-all relative">
      {isNew && (
        <span className="absolute top-3 right-3 rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-navy-950">
          NEW 2023
        </span>
      )}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-shrink-0 w-full md:w-24 text-center md:text-left">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600 mx-auto md:mx-0 mb-2 md:mb-0">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-navy-700 uppercase tracking-wider">Act {law.actNumber}/{law.year}</p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-navy-900">{law.name}</h3>
            {isNew && <span className="rounded-full bg-gold-100 px-1.5 py-0.5 text-xs font-bold text-gold-700">BNS/BNSS/BSA</span>}
          </div>
          <p className="text-sm text-navy-500">Ministry: {law.ministry}</p>
          <p className="mt-2 text-sm text-navy-600 line-clamp-2">{law.description}</p>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-navy-500">
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {law.sections} sections</span>
            {law.lastAmended && (
              <span className="flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Amended: {new Date(law.lastAmended).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 md:ml-auto">
          <a
            href={law.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-1.5 w-full md:w-auto justify-center"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Browse Sections
          </a>
        </div>
      </div>
    </div>
  );
}

function FeedList({ items, loading, empty }: { items: any[]; loading: boolean; empty: boolean }) {
  if (loading) return <LoadingState />;
  if (empty) return <EmptyState message="No recent judgments found" icon={RefreshCw} />;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <FeedCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function FeedCard({ item }: { item: any }) {
  const date = new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="card-surface p-4 hover:border-gold-300/50 transition-all">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-shrink-0 md:w-28 text-center">
          <div className="inline-flex flex-col items-center gap-1 bg-navy-100 px-3 py-2 rounded-lg">
            <span className="font-bold text-navy-900">{date.split(" ")[0]}</span>
            <span className="text-xs text-navy-500 uppercase">{date.split(" ").slice(1).join(" ")}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-navy-900 truncate">{item.title}</h4>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">New</span>
          </div>
          <p className="text-sm text-navy-500">{item.court}</p>
          <p className="mt-1 text-sm text-navy-600 line-clamp-1">{item.snippet}</p>
        </div>

        <div className="flex-shrink-0 md:ml-auto">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-1.5 w-full md:w-auto justify-center"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Read Full
          </a>
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn-secondary p-2 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-lg font-medium transition-all ${currentPage === page
            ? "bg-navy-900 text-white"
            : "text-navy-600 hover:bg-navy-100"}`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn-secondary p-2 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ExternalLinkCard({ icon, title, desc, href, color }: { icon: React.ReactNode; title: string; desc: string; href: string; color: string }) {
  const colorMap = {
    gold: "bg-gold-100 text-gold-600",
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card-surface p-6 hover:border-gold-300/50 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color as keyof typeof colorMap]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-navy-900 group-hover:text-gold-700 transition-colors">{title}</h3>
          <p className="mt-1 text-sm text-navy-600">{desc}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-600 group-hover:gap-2 transition-all">
            Open on Indian Kanoon
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      <p className="mt-4 text-navy-500">Loading precedents...</p>
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="card-surface p-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-navy-300 mb-4" />
      <h3 className="text-lg font-semibold text-navy-900 mb-2">No Results</h3>
      <p className="text-navy-600">{message}</p>
    </div>
  );
}