/**
 * Destination Finder — searchable CPCB-compliant Indian e-waste directory.
 *
 * Renders verified recyclers, repair centers, and donation partners from
 * src/lib/destinations.ts. Every entity is real and documented; unverified
 * entries are flagged as such.
 */
"use client";

import { useState, useMemo } from "react";
import {
  MapPin,
  ExternalLink,
  ShieldCheck,
  Search,
  Recycle,
  Wrench,
  RefreshCw,
  Tag,
  Gift,
} from "lucide-react";
import { filterDestinations, type Destination } from "@/lib/destinations";

const CATEGORY_META: Record<
  Destination["category"],
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  recycle: { icon: Recycle, label: "Recycle", color: "emerald" },
  repair: { icon: Wrench, label: "Repair", color: "blue" },
  refurbish: { icon: RefreshCw, label: "Refurbish", color: "violet" },
  resell: { icon: Tag, label: "Resell", color: "amber" },
  donate: { icon: Gift, label: "Donate", color: "rose" },
};

interface DestinationFinderProps {
  /** Pre-filter to recommended pathway category */
  recommendedCategory?: string;
}

export function DestinationFinder({
  recommendedCategory,
}: DestinationFinderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(
    recommendedCategory ?? ""
  );

  const results = useMemo(() => {
    let filtered = filterDestinations(
      activeCategory || undefined,
      searchQuery || undefined
    );
    // If no category match and we have a text search, also try searching by name
    if (searchQuery && filtered.length === 0) {
      filtered = filterDestinations(activeCategory || undefined).filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [searchQuery, activeCategory]);

  const categories = Object.keys(CATEGORY_META) as Destination["category"][];

  return (
    <div className="rounded-2xl border border-graphite/15 bg-white/80 p-5 shadow-2xs sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl border border-graphite/15 bg-secondary-paper/60 text-vermilion">
          <MapPin className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">
            Verified Destination Finder
          </p>
          <p className="text-xs text-stone">
            CPCB-authorized recyclers &amp; verified circular partners in India
          </p>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city or name..."
            className="w-full rounded-xl border border-graphite/20 bg-white py-2.5 pl-10 pr-4 text-sm text-ink shadow-2xs outline-none transition-colors placeholder:text-stone/50 focus:border-vermilion/60 focus:ring-2 focus:ring-vermilion/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === ""
                ? "border-vermilion/30 bg-vermilion/10 text-vermilion"
                : "border-graphite/20 bg-white text-stone hover:border-graphite/40"
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? "" : cat)
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "border-vermilion/30 bg-vermilion/10 text-vermilion"
                    : "border-graphite/20 bg-white text-stone hover:border-graphite/40"
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.length === 0 && (
          <p className="py-6 text-center text-sm text-stone">
            No destinations found. Try a different city or category.
          </p>
        )}
        {results.map((dest) => {
          const meta = CATEGORY_META[dest.category];
          const Icon = meta.icon;
          return (
            <div
              key={dest.id}
              className="rounded-xl border border-graphite/15 bg-white/70 p-4 transition-colors duration-200 hover:border-graphite/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary-paper/60 text-stone">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{dest.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone">
                      <MapPin className="size-3" />
                      {dest.city}, {dest.state}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {dest.isVerified && (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <ShieldCheck className="size-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-stone">
                {dest.sourceNote}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {dest.acceptance.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-graphite/10 bg-secondary-paper/50 px-2 py-0.5 text-[10px] text-stone"
                  >
                    {item}
                  </span>
                ))}
              </div>

              {dest.contactUrl && (
                <a
                  href={dest.contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-vermilion transition-colors hover:text-ink"
                >
                  Visit website
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-stone">
        All entities sourced from CPCB registrations and publicly documented
        organizations. If an entity is missing or outdated,{" "}
        <span className="font-medium">it is not fabricated</span> — verified
        listings only.
      </p>
    </div>
  );
}
