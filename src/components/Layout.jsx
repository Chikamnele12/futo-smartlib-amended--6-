import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import AssistantWidget from "./AssistantWidget";
import "../lib/theme";

export default function Layout({ searchPlaceholder, children }) {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Fade/slide cards in as they scroll into view (works for cards that load later too).
  useEffect(() => {
    const root = mainRef.current;
    if (!root || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    const seen = new WeakSet();
    const scan = () =>
      root.querySelectorAll(".card").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add("reveal");
        io.observe(el);
      });

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex font-sans bg-paper-100">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar placeholder={searchPlaceholder} onMenu={() => setNavOpen(true)} />
        <main
          ref={mainRef}
          key={location.pathname}
          className="page-enter p-4 sm:p-6 pb-24 lg:pb-6 space-y-6 flex-1 min-w-0"
        >
          {children}
        </main>
      </div>
      <BottomNav onMore={() => setNavOpen(true)} />
      <AssistantWidget />
    </div>
  );
}
