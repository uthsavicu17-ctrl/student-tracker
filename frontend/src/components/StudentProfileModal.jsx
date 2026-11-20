import React, { useState, useEffect } from 'react';
import { statsAPI } from '../api';
import { 
  X, 
  User, 
  Mail, 
  AlertTriangle, 
  Award, 
  BookOpen, 
  TrendingUp, 
  Percent, 
  CheckCircle2, 
  XCircle, 
  Clock 
} from 'lucide-react';

export default function StudentProfileModal({ studentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        const res = await statsAPI.getStudentDashboard(studentId);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load student scorecard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg">
              {data?.student?.name ? data.student.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black">{data?.student?.name || 'Student Scorecard'}</h2>
                {data?.summary?.isOverallAtRisk && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500 text-white">
                    At-Risk &lt; 75%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-3">
                <span>Roll: <strong className="text-white font-mono">{data?.student?.roll_number}</strong></span>
                <span>•</span>
                <span>Email: <strong className="text-white">{data?.student?.email}</strong></span>
                <span>•</span>
                <span>Dept: <strong className="text-white">{data?.student?.department}</strong></span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading comprehensive student report...</p>
            </div>
          ) : !data ? (
            <p className="text-center py-8 text-xs text-slate-400">Failed to load student data.</p>
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overall Attendance</p>
                  <p className={`text-2xl font-black mt-1 ${
                    data.summary.overallAttendancePercentage >= 75 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {data.summary.overallAttendancePercentage}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {data.summary.totalAttendedCount} / {data.summary.totalClassesConducted} Classes
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Internal CGPA</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">
                    {data.summary.cgpa} <span className="text-xs text-slate-400">/ 10</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Weighted Average</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Alerts</p>
                  <p className={`text-2xl font-black mt-1 ${data.alerts.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {data.alerts.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Intervention flags</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enrolled Subjects</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {data.subjectStats.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total registered courses</p>
                </div>
              </div>

              {/* Active Alerts */}
              {data.alerts && data.alerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Academic & Attendance Alerts</span>
                  </h4>
                  <div className="space-y-2">
                    {data.alerts.map((al, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold">{al.subjectCode} - {al.subjectName}</p>
                          <p className="text-rose-700">{al.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Subject-Wise Attendance & Academic Scorecard
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4 text-center">Sessions</th>
                        <th className="py-3 px-4 text-center">Attendance %</th>
                        <th className="py-3 px-4 text-center">Internal Score</th>
                        <th className="py-3 px-4 text-center">Grade</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.subjectStats.map(s => (
                        <tr key={s.subjectId} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-bold text-slate-800">
                            <div>{s.subjectCode} - {s.subjectName}</div>
                            <div className="text-[11px] font-normal text-slate-500">{s.facultyName}</div>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {s.attendance.present} / {s.attendance.totalSessions}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-black ${s.attendance.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {s.attendance.percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-indigo-600">
                            {s.academics.marksObtained} / {s.academics.maxMarks} ({s.academics.internalPercentage}%)
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-black px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {s.academics.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {s.attendance.isAtRisk ? (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-700">
                                At Risk
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-700">
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
