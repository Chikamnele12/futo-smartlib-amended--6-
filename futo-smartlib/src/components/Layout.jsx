import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout({ searchPlaceholder, children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex font-sans relative">
      <div className="app-wallpaper" />
      <div className="app-overlay" />

      <div className="relative z-10 flex w-full">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <TopBar placeholder={searchPlaceholder} />
          <main key={location.pathname} className="page-enter p-6 space-y-6 max-w-7xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
