import React from "react";

export default function Avatar({ profile, size = 36, className = "" }) {
  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const box = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) };

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name || "Profile photo"}
        style={box}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={box}
      className={`rounded-full bg-brand-700 text-white flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}
