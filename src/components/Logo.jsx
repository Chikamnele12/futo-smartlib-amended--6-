import React from "react";

/**
 * Original circular seal mark for SmartLib — an open book inside a ring,
 * in the app's indigo/violet brand color. This is an in-house design, not
 * a reproduction of FUTO's official crest.
 * To use the real university logo instead (if licensed), drop a file at
 * src/assets/futo-logo.png, import it, and render <img> instead of <svg>.
 */
export default function Logo({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="white" stroke="var(--color-brand-700)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="var(--color-brand-600)" strokeWidth="0.75" strokeDasharray="1.5 2" />
      <path
        d="M20 14c-1.8-1.1-4.2-1.5-6.5-1V26c2.3-0.5 4.7-0.1 6.5 1 1.8-1.1 4.2-1.5 6.5-1V13c-2.3-0.5-4.7-0.1-6.5 1Z"
        fill="var(--color-brand-700)"
      />
      <line x1="20" y1="14" x2="20" y2="27" stroke="white" strokeWidth="0.6" />
    </svg>
  );
}
