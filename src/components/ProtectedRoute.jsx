import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function ProtectedRoute({ children, staffOnly = false, adminOnly = false }) {
  const { session, isStaff, isAdmin, loading } = useAuth();

  if (loading || session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-100 font-sans text-ink-500">
        Loading your library...
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (staffOnly && !isStaff) return <Navigate to="/dashboard" replace />;

  return children;
}
