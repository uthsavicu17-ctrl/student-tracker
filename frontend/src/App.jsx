import React from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Navbar from './components/Navbar';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-white tracking-wide">
          Initializing EduTrack Academic Tracker...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      <div>
        <Navbar />
        <main className="pb-16">
          {user.role === 'faculty' || user.role === 'admin' ? (
            <FacultyDashboard />
          ) : (
            <StudentDashboard />
          )}
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium">
            EduTrack • Student Attendance and Academic Performance Tracker
          </p>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              API Server Online
            </span>
            <span>•</span>
            <span>SQLite v3 (Zero-Config Persistent Engine)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
