import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  LogIn, 
  UserCheck, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  Award,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' or 'student'
  const [email, setEmail] = useState('prof.sharma@college.edu');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTabChange = (role) => {
    setActiveTab(role);
    setError('');
    if (role === 'faculty') {
      setEmail('prof.sharma@college.edu');
      setPassword('password123');
    } else {
      setEmail('aarav.patel@student.edu');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, activeTab);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail, demoRole) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(demoEmail, demoRole);
    } catch (err) {
      setError('Failed to login with demo user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-4">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          EduTrack Portal
        </h1>
        <p className="mt-2 text-sm text-slate-300 font-medium">
          Student Attendance & Academic Performance Tracker
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-white/20 sm:px-10">
          
          {/* Role Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => handleTabChange('faculty')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'faculty'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Faculty Portal</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('student')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'student'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Student Portal</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 transition"
                placeholder={activeTab === 'faculty' ? 'faculty@college.edu' : 'student@student.edu'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to {activeTab === 'faculty' ? 'Faculty Portal' : 'Student Dashboard'}</span>
                </>
              )}
            </button>
          </form>

          {/* Demo 1-Click Evaluation Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant 1-Click Evaluation Accounts</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('prof.sharma@college.edu', 'faculty')}
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 flex items-center justify-between text-xs transition group"
              >
                <div className="text-left">
                  <p className="font-bold text-indigo-900">Prof. Rajesh Sharma (Faculty)</p>
                  <p className="text-[11px] text-indigo-600">Record Attendance & Internal Marks</p>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('aarav.patel@student.edu', 'student')}
                className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 flex items-center justify-between text-xs transition group"
              >
                <div className="text-left">
                  <p className="font-bold text-emerald-900 flex items-center gap-1">
                    Aarav Patel (Student - Top Performer)
                    <Award className="w-3.5 h-3.5 text-emerald-600 inline" />
                  </p>
                  <p className="text-[11px] text-emerald-600">94% Attendance • A+ Grade</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('rahul.verma@student.edu', 'student')}
                className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 flex items-center justify-between text-xs transition group"
              >
                <div className="text-left">
                  <p className="font-bold text-rose-900 flex items-center gap-1">
                    Rahul Verma (Student - Active Alerts)
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 inline" />
                  </p>
                  <p className="text-[11px] text-rose-600">58% Attendance • Low Attendance & Marks Alert</p>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              Default password for all accounts: <span className="font-mono font-bold text-slate-600">password123</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
