import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout({ searchPlaceholder, children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex font-sans bg-paper-100">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar placeholder={searchPlaceholder} />
        <main key={location.pathname} className="page-enter p-6 space-y-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
