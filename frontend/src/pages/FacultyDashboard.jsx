import React, { useState, useEffect } from 'react';
import { 
  statsAPI, 
  subjectsAPI, 
  sectionsAPI, 
  attendanceAPI, 
  assessmentsAPI, 
  studentsAPI 
} from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Percent,
  Plus,
  Search,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
  FileCheck,
  Save,
  Download,
  AlertTriangle,
  ChevronRight,
  Eye,
  Trash2,
  Edit,
  Sparkles,
  Database
} from 'lucide-react';
import NewSubjectModal from '../components/NewSubjectModal';
import NewSectionModal from '../components/NewSectionModal';
import NewAssessmentModal from '../components/NewAssessmentModal';
import StudentProfileModal from '../components/StudentProfileModal';
import FacultyCorrectionsQueue from '../components/FacultyCorrectionsQueue';
import UciDatasetExplorer from '../components/UciDatasetExplorer';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'marks' | 'subjects' | 'students'
  
  // Faculty summary & dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  
  // Active subject selection for attendance & marks
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjectStudents, setSubjectStudents] = useState([]);
  
  // Attendance recording state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceTopic, setAttendanceTopic] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { [studentId]: { status: 'Present', remarks: '' } }
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState('');
  
  // Assessment marks state
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [assessmentMarksSheet, setAssessmentMarksSheet] = useState([]);
  const [savingMarks, setSavingMarks] = useState(false);
  const [marksSuccessMsg, setMarksSuccessMsg] = useState('');
  
  // Modals state
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showNewAssessmentModal, setShowNewAssessmentModal] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState(null);

  // Search filter
  const [studentSearch, setStudentSearch] = useState('');
  const [allStudentsList, setAllStudentsList] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, [user?.id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [dashRes, subRes, secRes, studentsRes] = await Promise.all([
        statsAPI.getFacultyDashboard(),
        subjectsAPI.getAll({ myOnly: 'true' }),
        sectionsAPI.getAll(),
        studentsAPI.getAll()
      ]);

      setDashboardData(dashRes.data);
      setSubjects(subRes.data.subjects || []);
      setSections(secRes.data.sections || []);
      setAllStudentsList(studentsRes.data.students || []);

      if (subRes.data.subjects && subRes.data.subjects.length > 0) {
        const defaultSubId = subRes.data.subjects[0].id;
        setSelectedSubjectId(defaultSubId);
        loadSubjectDetails(defaultSubId);
      }
    } catch (err) {
      console.error('Failed to load faculty initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load subject students, attendance sessions, and assessments when selectedSubjectId changes
  const loadSubjectDetails = async (subId) => {
    if (!subId) return;
    try {
      const [studentsRes, sessionsRes, assessRes] = await Promise.all([
        subjectsAPI.getStudents(subId),
        attendanceAPI.getSessions(subId),
        assessmentsAPI.getAll(subId)
      ]);

      const studs = studentsRes.data.students || [];
      setSubjectStudents(studs);
      setAttendanceSessions(sessionsRes.data.sessions || []);
      setAssessments(assessRes.data.assessments || []);

      // Reset attendance roster with default 'Present'
      const initialRoster = {};
      studs.forEach(s => {
        initialRoster[s.id] = { status: 'Present', remarks: '' };
      });
      setAttendanceRecords(initialRoster);

      // Default select first assessment if available
      if (assessRes.data.assessments && assessRes.data.assessments.length > 0) {
        const firstAssId = assessRes.data.assessments[0].id;
        setSelectedAssessmentId(firstAssId);
        loadAssessmentMarks(firstAssId);
      } else {
        setSelectedAssessmentId('');
        setAssessmentMarksSheet([]);
      }
    } catch (err) {
      console.error('Failed to load subject details:', err);
    }
  };

  const handleSubjectChange = (e) => {
    const newId = e.target.value;
    setSelectedSubjectId(newId);
    loadSubjectDetails(newId);
  };

  const handleAssessmentChange = (e) => {
    const newAssId = e.target.value;
    setSelectedAssessmentId(newAssId);
    loadAssessmentMarks(newAssId);
  };

  const loadAssessmentMarks = async (assessmentId) => {
    if (!assessmentId) return;
    try {
      const res = await assessmentsAPI.getMarks(assessmentId);
      setAssessmentMarksSheet(res.data.students || []);
    } catch (err) {
      console.error('Failed to load marks sheet:', err);
    }
  };

  // Attendance quick actions
  const markAllStatus = (status) => {
    const updated = { ...attendanceRecords };
    subjectStudents.forEach(s => {
      updated[s.id] = { ...updated[s.id], status };
    });
    setAttendanceRecords(updated);
  };

  const toggleStudentStatus = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleStudentRemark = (studentId, remarks) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  // Submit attendance session
  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    if (!selectedSubjectId || !attendanceDate) return;

    setSubmittingAttendance(true);
    setAttendanceSuccessMsg('');

    const recordsArray = Object.keys(attendanceRecords).map(id => ({
      student_id: parseInt(id, 10),
      status: attendanceRecords[id].status,
      remarks: attendanceRecords[id].remarks
    }));

    try {
      await attendanceAPI.createSession({
        subject_id: parseInt(selectedSubjectId, 10),
        date: attendanceDate,
        topic: attendanceTopic.trim() || 'Lecture Session',
        records: recordsArray
      });

      setAttendanceSuccessMsg('✓ Attendance recorded successfully!');
      setAttendanceTopic('');
      // Reload sessions and stats
      loadSubjectDetails(selectedSubjectId);
      const dashRes = await statsAPI.getFacultyDashboard();
      setDashboardData(dashRes.data);

      setTimeout(() => setAttendanceSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit attendance');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Save assessment marks sheet
  const handleSaveMarks = async () => {
    if (!selectedAssessmentId) return;
    setSavingMarks(true);
    setMarksSuccessMsg('');

    const marksToSave = assessmentMarksSheet.map(item => ({
      student_id: item.student_id,
      marks_obtained: item.marks_obtained !== '' && item.marks_obtained !== null ? parseFloat(item.marks_obtained) : null,
      remarks: item.remarks || ''
    }));

    try {
      await assessmentsAPI.saveMarks(selectedAssessmentId, marksToSave);
      setMarksSuccessMsg('✓ Assessment marks saved and published successfully!');
      loadAssessmentMarks(selectedAssessmentId);
      // Refresh dashboard analytics
      const dashRes = await statsAPI.getFacultyDashboard();
      setDashboardData(dashRes.data);

      setTimeout(() => setMarksSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save marks');
    } finally {
      setSavingMarks(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    setAssessmentMarksSheet(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, marks_obtained: value };
      }
      return s;
    }));
  };

  const handleAssessmentRemarkChange = (studentId, value) => {
    setAssessmentMarksSheet(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, remarks: value };
      }
      return s;
    }));
  };

  // Export attendance session to CSV
  const handleExportCSV = (session) => {
    attendanceAPI.getSession(session.id).then(res => {
      const records = res.data.records || [];
      const csvContent = "data:text/csv;charset=utf-8," 
        + "Roll Number,Student Name,Status,Remarks\n"
        + records.map(r => `"${r.roll_number}","${r.student_name}","${r.status}","${r.remarks || ''}"`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Attendance_${session.subject_code}_${session.date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading Faculty Academic Management Portal...</p>
      </div>
    );
  }

  const { summary, subjects: subjectAnalytics = [], atRiskStudents = [], recentSessions = [] } = dashboardData || {};
  const currentSubjectObj = subjects.find(s => s.id === parseInt(selectedSubjectId, 10));
  const currentAssessmentObj = assessments.find(a => a.id === parseInt(selectedAssessmentId, 10));

  // Current session attendance counts
  const presentCount = Object.values(attendanceRecords).filter(r => r.status === 'Present').length;
  const lateCount = Object.values(attendanceRecords).filter(r => r.status === 'Late').length;
  const absentCount = Object.values(attendanceRecords).filter(r => r.status === 'Absent').length;
  const excusedCount = Object.values(attendanceRecords).filter(r => r.status === 'Excused').length;
  const totalRoster = subjectStudents.length;
  const currentSessionPercent = totalRoster > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalRoster) * 100) : 100;

  // Chart: Subject Attendance & Marks comparison
  const facultyChartData = {
    labels: subjectAnalytics.map(s => s.code),
    datasets: [
      {
        label: 'Avg Attendance %',
        data: subjectAnalytics.map(s => s.avgAttendancePercentage),
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderRadius: 6
      },
      {
        label: 'Avg Marks %',
        data: subjectAnalytics.map(s => s.avgMarksPercentage),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Faculty Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-xs font-semibold border border-indigo-400/20 text-indigo-200">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Faculty Academic Information System (SIS/LMS)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {user?.name}
            </h1>
            <p className="text-slate-300 text-sm flex flex-wrap items-center gap-x-4">
              <span>Department: <strong className="text-white">{user?.department || 'Computer Science & Engineering'}</strong></span>
              <span>•</span>
              <span>Role: <strong className="text-white capitalize">{user?.role}</strong></span>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setActiveTab('attendance'); }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center space-x-1.5 transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Take Attendance</span>
            </button>
            <button
              onClick={() => { setActiveTab('marks'); }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center space-x-1.5 transition"
            >
              <FileCheck className="w-4 h-4" />
              <span>Enter Marks</span>
            </button>
            <button
              onClick={() => setShowNewSubjectModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Subject</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex overflow-x-auto space-x-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        {[
          { id: 'overview', label: 'Dashboard & Analytics', icon: TrendingUp },
          { id: 'attendance', label: 'Attendance Management', icon: UserCheck },
          { id: 'marks', label: 'Internal Assessment Marks', icon: FileCheck },
          { id: 'disputes', label: 'Disputes Queue', icon: ShieldAlert, badge: dashboardData?.summary?.pendingCorrectionsCount },
          { id: 'uci', label: 'UCI Dataset & Benchmarks', icon: Database },
          { id: 'subjects', label: 'Subjects & Class Sections', icon: BookOpen },
          { id: 'students', label: 'Student Directory & Scorecards', icon: Users },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.id === 'disputes' && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] ml-1 shadow-sm animate-pulse">
                  {tab.badge}
                </span>
              )}
              {tab.id === 'overview' && atRiskStudents.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">

          {/* Pending Disputes Alert Banner */}
          {dashboardData?.summary?.pendingCorrectionsCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">
                    {dashboardData.summary.pendingCorrectionsCount} Attendance Correction Request{dashboardData.summary.pendingCorrectionsCount > 1 ? 's' : ''} Awaiting Adjudication
                  </h4>
                  <p className="text-xs text-amber-700">
                    Students have contested attendance records with supporting documentation for your assigned courses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('disputes')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition whitespace-nowrap"
              >
                Review Dispute Queue →
              </button>
            </div>
          )}
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Subjects</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{summary?.totalSubjects || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Active courses taught</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrolled Students</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{summary?.totalStudents || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Across all sections</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sessions Conducted</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{summary?.totalSessions || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Total lecture records</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">At-Risk Students</p>
                <p className={`text-2xl font-black mt-1 ${atRiskStudents.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {atRiskStudents.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">&lt; 75% attendance alert</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                atRiskStudents.length > 0 ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* At-Risk Students Watchlist Banner */}
          {atRiskStudents && atRiskStudents.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    Institutional At-Risk Watchlist ({atRiskStudents.length} Students &lt; 75% Attendance)
                  </h3>
                </div>
                <span className="text-xs text-rose-700 font-semibold hidden sm:inline">
                  Immediate Academic Intervention Recommended
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-rose-100/60 border-b border-rose-200 text-rose-900 font-bold uppercase text-[11px]">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4 text-center">Attended Classes</th>
                      <th className="py-3 px-4 text-center">Attendance %</th>
                      <th className="py-3 px-4 text-center">Threshold</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {atRiskStudents.map((st, i) => (
                      <tr key={i} className="hover:bg-rose-50/40 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{st.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">{st.rollNumber} • {st.email}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {st.subjectCode} - {st.subjectName}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700 font-medium">
                          {st.classesAttended} / {st.totalClasses} classes
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-black text-rose-600 px-2 py-0.5 rounded-full bg-rose-100 text-xs">
                            {st.attendancePercentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-medium">
                          {st.threshold}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setViewingStudentId(st.studentId)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
                          >
                            View Scorecard
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts & Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Subject Performance & Attendance Comparison Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Subject Performance & Attendance Overview</h3>
                  <p className="text-xs text-slate-500">Comparison of class average attendance and internal exam scores</p>
                </div>
              </div>
              <div className="h-64">
                <Bar 
                  data={facultyChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%` }, grid: { color: '#f1f5f9' } },
                      x: { grid: { display: false } }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Recent Attendance Sessions Stream */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Recent Lecture Sessions</h3>
                <p className="text-xs text-slate-500">Recently logged attendance records</p>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {recentSessions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No recent sessions recorded.</p>
                ) : (
                  recentSessions.map(ses => (
                    <div key={ses.id} className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-700 font-mono">{ses.subject_code}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{ses.date}</span>
                      </div>
                      <p className="font-medium text-slate-800 truncate">{ses.topic}</p>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Present: <strong>{ses.present_count} / {ses.total_students}</strong></span>
                        <span className="font-bold text-emerald-600">
                          {ses.total_students > 0 ? Math.round((ses.present_count / ses.total_students) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setActiveTab('attendance')}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                View Full Attendance Manager
              </button>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ATTENDANCE MANAGEMENT */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          
          {/* Subject & Flow Header */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Step 1: Select Subject</span>
              <h2 className="text-xl font-extrabold text-slate-900">Record & Track Student Attendance</h2>
              <p className="text-xs text-slate-500">Record date-wise attendance, mark Present/Absent/Late/Excused, and export records</p>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Active Subject:</label>
              <select
                value={selectedSubjectId}
                onChange={handleSubjectChange}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 focus:ring-2 focus:ring-blue-500 text-slate-800"
              >
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name} ({sub.section_name || 'Section A'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {attendanceSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{attendanceSuccessMsg}</span>
            </div>
          )}

          {/* Record Attendance Form + Roster */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Session Parameters Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Session Details</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Lecture Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Curriculum Topic / Lecture Focus *
                  </label>
                  <input
                    type="text"
                    value={attendanceTopic}
                    onChange={(e) => setAttendanceTopic(e.target.value)}
                    placeholder="e.g. B-Tree Indexing & Crash Recovery"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Real-time Session Live Counters */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Session Live Ratio</p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Attendance Rate:</span>
                    <span className={`text-sm font-black ${currentSessionPercent >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {currentSessionPercent}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                    <span className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-800 font-bold">{presentCount} Present</span>
                    <span className="p-1.5 rounded-lg bg-amber-100/80 text-amber-800 font-bold">{lateCount} Late</span>
                    <span className="p-1.5 rounded-lg bg-rose-100/80 text-rose-800 font-bold">{absentCount} Absent</span>
                    <span className="p-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold">{excusedCount} Excused</span>
                  </div>
                </div>
              </div>

              {/* Batch Action Buttons */}
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Batch Roster Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => markAllStatus('Present')}
                    className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllStatus('Absent')}
                    className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={submittingAttendance || totalRoster === 0}
                className="w-full mt-4 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{submittingAttendance ? 'Saving Attendance...' : 'Save & Submit Attendance'}</span>
              </button>
            </div>

            {/* Student Roster Table */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Class Roster ({subjectStudents.length} Enrolled Students)</h3>
                  <p className="text-xs text-slate-500">Toggle status buttons or type remarks per student</p>
                </div>
              </div>

              {subjectStudents.length === 0 ? (
                <p className="text-center py-12 text-xs text-slate-400">No students enrolled in this subject.</p>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                      <tr className="text-slate-600 font-bold uppercase text-[11px]">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4 text-center">Attendance Status</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjectStudents.map(student => {
                        const rec = attendanceRecords[student.id] || { status: 'Present', remarks: '' };
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{student.name}</p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {student.roll_number} • Overall: <span className={student.attendance?.percentage < 75 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{student.attendance?.percentage || 100}%</span>
                              </p>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 space-x-1">
                                {['Present', 'Late', 'Absent', 'Excused'].map(st => {
                                  const isSelected = rec.status === st;
                                  let activeClass = '';
                                  if (isSelected) {
                                    if (st === 'Present') activeClass = 'bg-emerald-600 text-white shadow-sm';
                                    else if (st === 'Late') activeClass = 'bg-amber-500 text-white shadow-sm';
                                    else if (st === 'Absent') activeClass = 'bg-rose-600 text-white shadow-sm';
                                    else activeClass = 'bg-slate-600 text-white shadow-sm';
                                  } else {
                                    activeClass = 'text-slate-600 hover:text-slate-900';
                                  }

                                  return (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => toggleStudentStatus(student.id, st)}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${activeClass}`}
                                    >
                                      {st}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={rec.remarks || ''}
                                onChange={(e) => handleStudentRemark(student.id, e.target.value)}
                                placeholder="Optional notes..."
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Past Sessions History Table & CSV Export */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Attendance History & Past Sessions ({attendanceSessions.length})</h3>
                <p className="text-xs text-slate-500">View logged dates, attendance percentages, and download CSV reports</p>
              </div>
            </div>

            {attendanceSessions.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">No attendance sessions recorded yet for this subject.</p>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Topic Covered</th>
                      <th className="py-3 px-4 text-center">Present</th>
                      <th className="py-3 px-4 text-center">Late</th>
                      <th className="py-3 px-4 text-center">Absent</th>
                      <th className="py-3 px-4 text-center">Attendance %</th>
                      <th className="py-3 px-4 text-right">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceSessions.map(ses => {
                      const perc = ses.total_marked > 0 
                        ? Math.round(((ses.present_count + ses.late_count * 0.5) / ses.total_marked) * 100) 
                        : 0;

                      return (
                        <tr key={ses.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {ses.date}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {ses.topic || 'Class Lecture'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600">
                            {ses.present_count}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-600">
                            {ses.late_count}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600">
                            {ses.absent_count}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-black px-2 py-0.5 rounded-full text-xs ${
                              perc >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {perc}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleExportCSV(ses)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 inline-flex items-center space-x-1 transition"
                              title="Download Attendance CSV"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span>CSV</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: INTERNAL ASSESSMENT MARKS */}
      {activeTab === 'marks' && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Step 2: Internal Assessment Grading</span>
              <h2 className="text-xl font-extrabold text-slate-900">Manage Internal Assessment Marks</h2>
              <p className="text-xs text-slate-500">Create tests, enter student marks, auto-compute class average and pass rates</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedSubjectId}
                onChange={handleSubjectChange}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 text-slate-800"
              >
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowNewAssessmentModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Assessment</span>
              </button>
            </div>
          </div>

          {marksSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{marksSuccessMsg}</span>
            </div>
          )}

          {/* Assessment Selector + Stats Ribbon */}
          {assessments.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No assessments found for this subject.</p>
              <p className="text-xs text-slate-400">Click the "New Assessment" button to add a Quiz, Midterm Exam, or Assignment.</p>
              <button
                onClick={() => setShowNewAssessmentModal(true)}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
              >
                Create First Assessment
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Assessment picker cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {assessments.map(ass => {
                  const isSelected = ass.id === parseInt(selectedAssessmentId, 10);
                  return (
                    <div
                      key={ass.id}
                      onClick={() => { setSelectedAssessmentId(ass.id); loadAssessmentMarks(ass.id); }}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {ass.type}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">{ass.date}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1">{ass.title}</h4>
                      </div>

                      <div className="pt-3 border-t border-slate-100 mt-2 flex justify-between items-center text-xs">
                        <span className="text-slate-500">Max: <strong>{ass.max_marks}</strong></span>
                        <span className="text-emerald-700 font-bold">Avg: {ass.class_average || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Marks Entry Spreadsheet Card */}
              {currentAssessmentObj && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        Mark Entry Sheet: {currentAssessmentObj.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Max Marks: <strong className="text-slate-800">{currentAssessmentObj.max_marks}</strong> • Weightage: <strong className="text-slate-800">{currentAssessmentObj.weightage}%</strong> • Pass Standard: {currentAssessmentObj.max_marks * 0.4} marks (40%)
                      </p>
                    </div>

                    <button
                      onClick={handleSaveMarks}
                      disabled={savingMarks}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center space-x-1.5 transition disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingMarks ? 'Saving...' : 'Save & Publish Marks'}</span>
                    </button>
                  </div>

                  {/* Marks Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4 text-center">Marks (Max {currentAssessmentObj.max_marks})</th>
                          <th className="py-3 px-4 text-center">Score %</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4">Instructor Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assessmentMarksSheet.map(item => {
                          const val = item.marks_obtained;
                          const num = val !== '' && val !== null ? parseFloat(val) : null;
                          const percent = num !== null ? Math.round((num / currentAssessmentObj.max_marks) * 100) : null;
                          const isPass = percent !== null && percent >= 40;
                          const isInvalid = num !== null && num > currentAssessmentObj.max_marks;

                          return (
                            <tr key={item.student_id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900">{item.student_name}</p>
                                <p className="text-[11px] font-mono text-slate-500">{item.roll_number}</p>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={currentAssessmentObj.max_marks}
                                  step="0.5"
                                  value={val !== null && val !== undefined ? val : ''}
                                  onChange={(e) => handleMarkChange(item.student_id, e.target.value)}
                                  placeholder="0"
                                  className={`w-24 text-center px-3 py-1.5 rounded-xl border text-xs font-bold ${
                                    isInvalid 
                                      ? 'border-rose-500 bg-rose-50 text-rose-700' 
                                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'
                                  }`}
                                />
                                {isInvalid && (
                                  <p className="text-[10px] text-rose-600 font-bold mt-1">Cannot exceed {currentAssessmentObj.max_marks}</p>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center font-bold font-mono">
                                {percent !== null ? (
                                  <span className={isPass ? 'text-emerald-600' : 'text-rose-600'}>
                                    {percent}%
                                  </span>
                                ) : '—'}
                              </td>

                              <td className="py-3 px-4 text-center">
                                {percent !== null ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {isPass ? 'Pass' : 'Remedial'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">Pending</span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={item.remarks || ''}
                                  onChange={(e) => handleAssessmentRemarkChange(item.student_id, e.target.value)}
                                  placeholder="e.g. Excellent work / Focus on Unit 2"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* TAB 4: SUBJECTS & CLASS SECTIONS */}
      {activeTab === 'subjects' && (
        <div className="space-y-8">
          
          {/* Subjects Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Course Subjects Curriculum</h3>
                <p className="text-xs text-slate-500">Manage subject titles, credit hours, and minimum attendance thresholds</p>
              </div>

              <button
                onClick={() => setShowNewSubjectModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Subject</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Class Section</th>
                    <th className="py-3 px-4 text-center">Credits</th>
                    <th className="py-3 px-4 text-center">Threshold</th>
                    <th className="py-3 px-4 text-center">Planned Classes</th>
                    <th className="py-3 px-4 text-center">Conducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {s.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.name}
                        {s.description && (
                          <p className="text-[11px] text-slate-500 font-normal">{s.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {s.section_name || 'CSE - Section A'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {s.credits}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {s.attendance_threshold}%
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {s.total_classes_planned}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-indigo-600">
                        {s.total_sessions_conducted || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sections Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Class Sections & Cohorts</h3>
                <p className="text-xs text-slate-500">Manage academic semesters and cohort groupings</p>
              </div>

              <button
                onClick={() => setShowNewSectionModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Section</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Section Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Semester</th>
                    <th className="py-3 px-4 text-center">Academic Year</th>
                    <th className="py-3 px-4 text-center">Enrolled Students</th>
                    <th className="py-3 px-4 text-center">Courses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sections.map(sec => (
                    <tr key={sec.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sec.name}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {sec.department}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        Sem {sec.semester}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {sec.academic_year}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {sec.student_count || 10}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-600">
                        {sec.subject_count || 4}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: STUDENT DIRECTORY & SCORECARDS */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Comprehensive Student Roster</h3>
              <p className="text-xs text-slate-500">Monitor individual student overall attendance %, test performance, and alert status</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, roll no..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4 text-center">Overall Attendance</th>
                  <th className="py-3 px-4 text-center">Academic Avg</th>
                  <th className="py-3 px-4 text-center">Intervention Alert</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allStudentsList
                  .filter(st => 
                    st.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                    (st.roll_number && st.roll_number.toLowerCase().includes(studentSearch.toLowerCase()))
                  )
                  .map(st => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {st.name}
                        <p className="text-[11px] font-normal text-slate-400">{st.email}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {st.roll_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {st.section_name || 'CSE - Section A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-black px-2.5 py-0.5 rounded-full text-xs ${
                          st.overallAttendance >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {st.overallAttendance}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-indigo-600">
                        {st.marksPercentage}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {st.isAtRisk ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>At-Risk</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setViewingStudentId(st.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-blue-600 hover:text-blue-700 text-xs transition"
                        >
                          View Scorecard
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB: ATTENDANCE DISPUTES QUEUE */}
      {activeTab === 'disputes' && (
        <FacultyCorrectionsQueue onDecisionMade={loadInitialData} />
      )}

      {/* TAB: UCI DATASET & EMPIRICAL BENCHMARKS */}
      {activeTab === 'uci' && (
        <UciDatasetExplorer />
      )}

      {/* Modals */}
      {showNewSubjectModal && (
        <NewSubjectModal
          sections={sections}
          onClose={() => setShowNewSubjectModal(false)}
          onCreated={() => {
            loadInitialData();
          }}
        />
      )}

      {showNewSectionModal && (
        <NewSectionModal
          onClose={() => setShowNewSectionModal(false)}
          onCreated={() => {
            loadInitialData();
          }}
        />
      )}

      {showNewAssessmentModal && (
        <NewAssessmentModal
          subjectId={parseInt(selectedSubjectId, 10)}
          onClose={() => setShowNewAssessmentModal(false)}
          onCreated={() => {
            loadSubjectDetails(selectedSubjectId);
          }}
        />
      )}

      {viewingStudentId && (
        <StudentProfileModal
          studentId={viewingStudentId}
          onClose={() => setViewingStudentId(null)}
        />
      )}

    </div>
  );
}
