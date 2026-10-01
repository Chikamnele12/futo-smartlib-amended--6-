import React, { useState } from "react";
import { SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import Layout from "../components/Layout";
import ResourceCard from "../components/ResourceCard";
import { useResources } from "../lib/useResources";

const FACULTIES = ["All", "Engineering", "Science", "Management", "Social Sciences", "Agriculture"];

export default function ResourceListPage({ type, heading, crumb, searchPlaceholder }) {
  const [faculty, setFaculty] = useState("All");
  const { resources, loading, error } = useResources(type, { faculty });

  return (
    <Layout searchPlaceholder={searchPlaceholder}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">{heading}</h1>
          <p className="text-sm text-ink-500">Home &gt; {crumb}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FACULTIES.map((f) => (
            <button
              key={f}
              onClick={() => setFaculty(f)}
              className={`pill-tab px-4 py-2 rounded-lg text-sm font-medium ${
                faculty === f ? "active" : "bg-paper-50 text-ink-700 border border-paper-300 hover:bg-paper-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2 text-sm text-ink-700 bg-paper-50 hover:bg-paper-200 transition-colors">
            <SlidersHorizontal size={14} /> Advanced Filter
          </button>
          <div className="flex items-center border border-paper-300 rounded-lg overflow-hidden">
            <button className="p-2 bg-brand-700 text-white"><LayoutGrid size={15} /></button>
            <button className="p-2 bg-paper-50 text-ink-500 hover:bg-paper-200"><List size={15} /></button>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-ink-500">Loading catalog...</p>}
      {error && <p className="text-sm text-rose-ink">{error}</p>}
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
