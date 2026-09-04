import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Layout from "../components/Layout";
import ResourceCard from "../components/ResourceCard";
import { useResources } from "../lib/useResources";

const FACULTIES = ["All", "Engineering", "Science", "Management", "Social Sciences", "Agriculture"];

export default function ResourceListPage({ type, heading, crumb, searchPlaceholder }) {
  const [faculty, setFaculty] = useState("All");
  const { resources, loading, error } = useResources(type, { faculty });

  return (
    <Layout searchPlaceholder={searchPlaceholder}>
      <div>
        <h1 className="font-display text-3xl text-ink-900">{heading}</h1>
        <p className="text-sm text-ink-500">Catalog &gt; {crumb}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FACULTIES.map((f) => (
            <button
              key={f}
              onClick={() => setFaculty(f)}
              className={`px-4 py-2 text-sm transition-colors border ${
                faculty === f
                  ? "bg-forest-800 text-paper-50 border-forest-800"
                  : "bg-paper-50 text-ink-700 border-paper-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 border border-paper-300 px-3 py-2 text-sm text-ink-700">
          <SlidersHorizontal size={14} /> Advanced filter
        </button>
      </div>

      {loading && <p className="text-sm text-ink-500">Loading catalog...</p>}
      {error && <p className="text-sm text-clay-600">{error}</p>}
      {!loading && !error && resources.length === 0 && (
        <p className="text-sm text-ink-500">Nothing here yet. Staff can add resources from Upload Resources.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {resources.map((r, i) => (
          <ResourceCard key={r.id} resource={r} index={i} />
        ))}
      </div>

      {!loading && resources.length > 0 && (
        <p className="text-sm text-ink-500">Showing {resources.length} item{resources.length === 1 ? "" : "s"}</p>
      )}
    </Layout>
  );
}
