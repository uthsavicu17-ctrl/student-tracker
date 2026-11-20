import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  LogOut, 
  User, 
  ChevronDown, 
  Sparkles, 
  AlertTriangle, 
  Award,
  BookOpen,
  Users
} from 'lucide-react';

export default function Navbar({ onOpenNewSubject, onOpenNewSection }) {
  const { user, logout, demoLogin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleQuickSwitch = async (email, role) => {
    setSwitching(true);
    setDropdownOpen(false);
    try {
      await demoLogin(email, role);
    } catch (err) {
      console.error('Failed to switch user:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                EduTrack
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-blue-100 text-blue-700">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Attendance & Academic Performance Tracker</p>
          </div>
        </div>

        {/* Right side controls & Profile */}
        <div className="flex items-center space-x-3">
          
          {/* Quick Demo Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              title="Switch demo account to evaluate different roles"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Quick Role Switch:</span>
              <span className="font-semibold text-blue-700 capitalize">{user?.role}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">1-Click Demo Evaluation Accounts</p>
                </div>

                <div className="p-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-500">FACULTY ROLES</div>
                  <button
                    onClick={() => handleQuickSwitch('prof.sharma@college.edu', 'faculty')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Prof. Rajesh Sharma</p>
                      <p className="text-[11px] text-slate-500">Faculty (DBMS & OS)</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Faculty</span>
                  </button>

                  <button
                    onClick={() => handleQuickSwitch('dr.anita@college.edu', 'faculty')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Dr. Anita Desai</p>
                      <p className="text-[11px] text-slate-500">Faculty (Networks)</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Faculty</span>
                  </button>
                </div>

                <div className="p-1 border-t border-slate-100">
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-500">STUDENT SCENARIOS</div>
                  <button
                    onClick={() => handleQuickSwitch('aarav.patel@student.edu', 'student')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 flex items-center gap-1">
                        Aarav Patel
                        <Award className="w-3 h-3 text-emerald-600 inline" />
                      </p>
                      <p className="text-[11px] text-emerald-600 font-medium">94% Attendance • Top Achiever</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Student</span>
                  </button>

                  <button
                    onClick={() => handleQuickSwitch('rahul.verma@student.edu', 'student')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 flex items-center gap-1">
                        Rahul Verma
                        <AlertTriangle className="w-3 h-3 text-rose-600 inline" />
                      </p>
                      <p className="text-[11px] text-rose-600 font-medium">58% Attendance • Active Alerts!</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">At-Risk</span>
                  </button>

                  <button
                    onClick={() => handleQuickSwitch('vikram.mehta@student.edu', 'student')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Vikram Mehta</p>
                      <p className="text-[11px] text-amber-600 font-medium">75% Attendance • Borderline</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Student</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User profile card */}
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shadow-inner">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs text-slate-800 truncate max-w-[140px]">{user?.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  user?.role === 'faculty' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {user?.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {user?.roll_number ? `Roll: ${user.roll_number}` : user?.department || user?.email}
              </p>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
