import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout({ searchPlaceholder, children }) {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // close the mobile menu whenever the page changes
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex font-sans bg-paper-100">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar placeholder={searchPlaceholder} onMenu={() => setNavOpen(true)} />
        <main key={location.pathname} className="page-enter p-4 sm:p-6 space-y-6 flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
