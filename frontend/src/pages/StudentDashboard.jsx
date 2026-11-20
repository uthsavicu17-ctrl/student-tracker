import React, { useState, useEffect } from 'react';
import { statsAPI, attendanceAPI } from '../api';
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
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  XCircle,
  FileText,
  Percent,
  ChevronRight,
  ShieldAlert,
  Info,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import SubjectDetailModal from '../components/SubjectDetailModal';
import AttendanceWhatIfSimulator from '../components/AttendanceWhatIfSimulator';
import { correctionsAPI } from '../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, [user?.id]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, corrRes] = await Promise.all([
        statsAPI.getStudentDashboard(),
        correctionsAPI.getStudentCorrections()
      ]);
      setData(statsRes.data);
      setCorrections(corrRes.data.requests || []);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError('Could not load academic performance data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Calculating attendance & performance metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="text-rose-800 font-bold">{error || 'Data unavailable'}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { student, summary, alerts, subjectStats, timeline } = data;

  // 1. Chart Data: Subject-wise Attendance Bar Chart
  const attendanceChartData = {
    labels: subjectStats.map(s => s.subjectCode),
    datasets: [
      {
        label: 'Attendance %',
        data: subjectStats.map(s => s.attendance.percentage),
        backgroundColor: subjectStats.map(s => s.attendance.percentage < 75 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(59, 130, 246, 0.85)'),
        borderColor: subjectStats.map(s => s.attendance.percentage < 75 ? '#dc2626' : '#2563eb'),
        borderWidth: 1.5,
        borderRadius: 8
      }
    ]
  };

  const attendanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Attendance: ${context.raw}% (${context.raw < 75 ? '⚠️ Below Threshold' : '✓ Normal'})`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
        grid: { color: '#f1f5f9' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // 2. Chart Data: Academic Performance vs Class Average
  const academicChartData = {
    labels: subjectStats.map(s => s.subjectCode),
    datasets: [
      {
        label: 'My Score %',
        data: subjectStats.map(s => s.academics.internalPercentage || s.academics.marksPercentage),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderColor: '#4f46e5',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const academicChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Score: ${ctx.raw}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
        grid: { color: '#f1f5f9' }
      },
      x: { grid: { display: false } }
    }
  };

  // 3. Chart Data: Attendance Status Breakdown Doughnut
  const totalPresent = subjectStats.reduce((acc, s) => acc + s.attendance.present, 0);
  const totalLate = subjectStats.reduce((acc, s) => acc + s.attendance.late, 0);
  const totalAbsent = subjectStats.reduce((acc, s) => acc + s.attendance.absent, 0);
  const totalExcused = subjectStats.reduce((acc, s) => acc + s.attendance.excused, 0);

  const statusDoughnutData = {
    labels: ['Present', 'Late', 'Absent', 'Excused'],
    datasets: [
      {
        data: [totalPresent, totalLate, totalAbsent, totalExcused],
        backgroundColor: [
          '#10b981', // emerald
          '#f59e0b', // amber
          '#ef4444', // rose
          '#64748b'  // slate
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Student Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Academic Session 2025–2026 • Semester 5</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {student.name}
            </h1>
            <p className="text-slate-300 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Roll No: <strong className="text-white font-mono">{student.roll_number}</strong></span>
              <span>•</span>
              <span>Dept: <strong className="text-white">{student.department}</strong></span>
              <span>•</span>
              <span>Section: <strong className="text-white">{student.section_name || 'CSE - Section A'}</strong></span>
            </p>
          </div>

          {/* Quick Overall Status Pill */}
          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Overall Attendance</p>
              <p className={`text-2xl font-black ${
                summary.overallAttendancePercentage >= 75 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {summary.overallAttendancePercentage}%
              </p>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Internal CGPA</p>
              <p className="text-2xl font-black text-amber-300">
                {summary.cgpa} <span className="text-xs text-slate-300 font-normal">/ 10</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Explainable Academic Risk Assistant Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Academic Risk Assistant (Rule-Based Explainable Findings: {alerts.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 shadow-sm transition ${
                  alert.severity === 'critical'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${
                        alert.severity === 'critical' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-sm">
                        {alert.type === 'attendance_warning' ? `Attendance Deficit: ${alert.subjectCode}` : `Academic Mastery Warning: ${alert.subjectCode}`}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      alert.severity === 'critical' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-slate-800">
                      Reason: <span className="font-normal">{alert.reason || alert.message}</span>
                    </p>
                    {alert.supportingData && (
                      <p className="text-[11px] text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-200/50">
                        <strong>Evidence:</strong> {alert.supportingData}
                      </p>
                    )}
                    {alert.thresholdRule && (
                      <p className="text-[11px] text-slate-600">
                        <strong>Institutional Criterion:</strong> {alert.thresholdRule}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700">Action Recommendation:</span>
                    <span className="font-bold text-slate-500 font-mono text-[10px]">{alert.provenance}</span>
                  </div>
                  <p className="font-semibold text-rose-800 bg-white/70 p-2 rounded-lg border border-rose-200/70">
                    {alert.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Achiever Commendation (if applicable) */}
      {summary.overallAttendancePercentage >= 85 && summary.cgpa >= 8.5 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              Dean's Honor Roll Candidate • Exemplary Academic Standing
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Outstanding commitment! Your attendance is {summary.overallAttendancePercentage}% and CGPA is {summary.cgpa}/10. Keep up the phenomenal work.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Attendance</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {summary.overallAttendancePercentage}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.totalAttendedCount} attended of {summary.totalClassesConducted} classes
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
            summary.overallAttendancePercentage >= 75
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}>
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* CGPA Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Semester CGPA</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">
              {summary.cgpa} <span className="text-sm font-normal text-slate-400">/ 10</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Weighted Grade Point Average
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Enrolled Subjects */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrolled Subjects</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {summary.enrolledSubjectsCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Total internal credits: {subjectStats.reduce((acc, s) => acc + s.credits, 0)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Status Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Academic Standing</p>
            <p className={`text-xl font-black mt-1 ${
              summary.isOverallAtRisk ? 'text-rose-600' : 'text-emerald-600'
            }`}>
              {summary.isOverallAtRisk ? 'At Risk' : 'Good Standing'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {alerts.length === 0 ? 'No active alerts' : `${alerts.length} action items`}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            summary.isOverallAtRisk 
              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            {summary.isOverallAtRisk ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Visual Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subject Attendance Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Subject-wise Attendance Comparison</h3>
              <p className="text-xs text-slate-500">Minimum mandatory attendance threshold is 75%</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> ≥ 75% Safe
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> &lt; 75% Critical
              </span>
            </div>
          </div>

          <div className="h-64">
            <Bar data={attendanceChartData} options={attendanceChartOptions} />
          </div>
        </div>

        {/* Attendance Breakdown Doughnut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Session Status Breakdown</h3>
            <p className="text-xs text-slate-500">Total sessions recorded across all subjects</p>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            <Doughnut 
              data={statusDoughnutData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                cutout: '70%'
              }} 
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold">
              {totalPresent} Present
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800 font-bold">
              {totalLate} Late
            </div>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-800 font-bold">
              {totalAbsent} Absent
            </div>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 font-bold">
              {totalExcused} Excused
            </div>
          </div>
        </div>

      </div>

      {/* Subject-Wise Academic Performance & Attendance Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">
              Enrolled Subjects & Performance Cards
            </h2>
            <p className="text-xs text-slate-500">
              Click any subject to view complete attendance calendar and assessment marks
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectStats.map((sub) => (
            <div
              key={sub.subjectId}
              onClick={() => setSelectedSubject(sub)}
              className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition flex flex-col justify-between relative overflow-hidden"
            >
              {sub.attendance.isAtRisk && (
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl tracking-wider uppercase">
                  At-Risk &lt; 75%
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                      {sub.subjectCode}
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-base mt-1 group-hover:text-blue-600 transition">
                      {sub.subjectName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Instructor: <span className="font-medium text-slate-700">{sub.facultyName || 'Department Faculty'}</span> • {sub.credits} Credits
                    </p>
                  </div>
                </div>

                {/* Attendance Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">Attendance Progress</span>
                    <span className={`font-extrabold ${
                      sub.attendance.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {sub.attendance.percentage}% ({sub.attendance.present} of {sub.attendance.totalSessions} classes)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sub.attendance.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, sub.attendance.percentage)}%` }}
                    />
                  </div>
                  {sub.attendance.isAtRisk && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Need {sub.attendance.classesToAttend} consecutive classes to reach 75%
                    </p>
                  )}
                </div>

                {/* Academic Grade / Score Preview */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Internal Grade</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-lg font-black text-slate-800">{sub.academics.grade}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                        {sub.academics.label}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Marks Scored</p>
                    <p className="text-sm font-bold text-indigo-600 mt-0.5">
                      {sub.academics.marksObtained} / {sub.academics.maxMarks} ({sub.academics.internalPercentage}%)
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold">
                <span>View Full Attendance & Mark Sheet</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prominent Attendance What-If Simulator */}
      <AttendanceWhatIfSimulator subjectStats={subjectStats} />

      {/* Attendance Dispute & Correction Portal (Student Section) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Attendance Dispute & Correction History
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Track the adjudication status of all attendance correction requests submitted to course faculty.
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {corrections.length} Total Requests Submitted
          </span>
        </div>

        {corrections.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-1">
            <p>No active attendance disputes or correction requests.</p>
            <p className="text-[11px] text-slate-400">
              To contest an absence or incorrect status, click on any course above and select <strong>"Dispute Record"</strong> in the Attendance Log.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Dispute ID</th>
                  <th className="py-3 px-4">Subject & Date</th>
                  <th className="py-3 px-4 text-center">Status Change</th>
                  <th className="py-3 px-4">Student Reason</th>
                  <th className="py-3 px-4 text-center">Decision Status</th>
                  <th className="py-3 px-4">Faculty Decision Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {corrections.map(c => (
                  <tr key={c.request_id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">
                      #{c.request_id}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{c.subject_code} - {c.subject_name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{c.lecture_date}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-rose-700">{c.original_status}</span>
                      <span className="text-slate-400 mx-1">➔</span>
                      <span className="font-bold text-emerald-700">{c.requested_status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic max-w-xs truncate">
                      "{c.student_reason}"
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        c.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        c.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-[11px]">
                      {c.decision_reason ? (
                        <span>
                          <strong className="text-slate-900">{c.reviewer_name || 'Faculty'}:</strong> "{c.decision_reason}"
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting faculty review</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for viewing detailed subject logs */}
      {selectedSubject && (
        <SubjectDetailModal
          subject={selectedSubject}
          studentId={student.id}
          onClose={() => {
            setSelectedSubject(null);
            fetchDashboard();
          }}
        />
      )}

    </div>
  );
}
