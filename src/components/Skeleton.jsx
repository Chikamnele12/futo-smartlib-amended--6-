import React from "react";

// Grey shimmering placeholders shown while data loads.
export function SkeletonCard() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="skeleton h-40" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-3 w-2/5 rounded" />
        <div className="skeleton h-9 w-full rounded-md mt-2" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="p-4 space-y-3" aria-hidden="true">
      <div className="skeleton h-4 w-1/2 rounded" />
      <div className="skeleton h-3 w-1/4 rounded" />
      <div className="skeleton h-2 w-full rounded-full mt-4" />
    </div>
  );
}
