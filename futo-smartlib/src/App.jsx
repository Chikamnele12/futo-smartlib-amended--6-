import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AcademicBooks from "./pages/AcademicBooks";
import EBooks from "./pages/EBooks";
import PdfLibrary from "./pages/PdfLibrary";
import RevisionNotes from "./pages/RevisionNotes";
import PastQuestions from "./pages/PastQuestions";
import BorrowedItems from "./pages/BorrowedItems";
import Reports from "./pages/Reports";
import UploadResources from "./pages/UploadResources";
import Users from "./pages/Users";
import AdminLibrarians from "./pages/AdminLibrarians";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/academic-books" element={<ProtectedRoute><AcademicBooks /></ProtectedRoute>} />
          <Route path="/ebooks" element={<ProtectedRoute><EBooks /></ProtectedRoute>} />
          <Route path="/pdf-library" element={<ProtectedRoute><PdfLibrary /></ProtectedRoute>} />
          <Route path="/revision-notes" element={<ProtectedRoute><RevisionNotes /></ProtectedRoute>} />
          <Route path="/past-questions" element={<ProtectedRoute><PastQuestions /></ProtectedRoute>} />
          <Route path="/borrowed-items" element={<ProtectedRoute><BorrowedItems /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/reports" element={<ProtectedRoute staffOnly><Reports /></ProtectedRoute>} />
          <Route path="/upload-resources" element={<ProtectedRoute staffOnly><UploadResources /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute staffOnly><Users /></ProtectedRoute>} />
          <Route path="/admin/librarians" element={<ProtectedRoute adminOnly><AdminLibrarians /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
