import React, { useState, useEffect } from 'react';
import { attendanceAPI, assessmentsAPI } from '../api';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  Award, 
  BookOpen, 
  FileCheck,
  TrendingUp,
  Percent,
  Calculator,
  ShieldAlert,
  History
} from 'lucide-react';
import AttendanceWhatIfSimulator from './AttendanceWhatIfSimulator';
import AttendanceDisputeModal from './AttendanceDisputeModal';
import AttendanceAuditModal from './AttendanceAuditModal';

export default function SubjectDetailModal({ subject, studentId, onClose }) {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'marks' | 'simulator'
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disputingRecord, setDisputingRecord] = useState(null);
  const [auditingRecordId, setAuditingRecordId] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await attendanceAPI.getStudentAttendance(studentId, subject.subjectId);
      setAttendanceHistory(res.data.history || []);
    } catch (err) {
      console.error('Failed to load detailed history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [subject.subjectId, studentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {subject.subjectCode}
              </span>
              <span className="text-xs text-slate-400">• {subject.credits} Credits</span>
              {subject.attendance.isAtRisk && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ⚠️ Attendance Alert &lt; 75%
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{subject.subjectName}</h2>
            <p className="text-xs text-slate-300">
              Instructor: <strong className="text-white">{subject.facultyName || 'Course Instructor'}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance</p>
            <p className={`text-lg font-black ${
              subject.attendance.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {subject.attendance.percentage}%
            </p>
            <p className="text-[10px] text-slate-500">{subject.attendance.present} of {subject.attendance.totalSessions} sessions</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Internal Score</p>
            <p className="text-lg font-black text-indigo-600">
              {subject.academics.internalPercentage}%
            </p>
            <p className="text-[10px] text-slate-500">{subject.academics.marksObtained} / {subject.academics.maxMarks} marks</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Grade Letter</p>
            <p className="text-lg font-black text-slate-800">{subject.academics.grade}</p>
            <p className="text-[10px] text-slate-500">{subject.academics.label}</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Threshold</p>
            <p className="text-lg font-black text-slate-800">{subject.attendance.threshold}%</p>
            <p className="text-[10px] text-slate-500">Minimum Required</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-3 space-x-4 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Attendance Log ({attendanceHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('marks')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'marks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Internal Marks ({subject.academics.assessments?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
              activeTab === 'simulator'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>What-If Simulator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching subject records...</p>
            </div>
          ) : activeTab === 'attendance' ? (
            <div className="space-y-4">
              
              {subject.attendance.isAtRisk && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3 text-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Institutional Minimum Attendance Warning</p>
                    <p className="mt-1">
                      You are currently at {subject.attendance.percentage}%, which is below the mandatory {subject.attendance.threshold}% attendance criterion.
                      To regain eligibility for final semester examinations, you must attend the next <strong>{subject.attendance.classesToAttend} consecutive lectures</strong> without further absences.
                    </p>
                  </div>
                </div>
              )}

              {attendanceHistory.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">No attendance records found for this subject.</p>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Topic Covered</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Dispute / Correction</th>
                        <th className="py-3 px-4 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceHistory.map((rec) => {
                        let badgeColor = 'bg-slate-100 text-slate-700';
                        let Icon = CheckCircle2;
                        if (rec.status === 'Present') {
                          badgeColor = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                          Icon = CheckCircle2;
                        } else if (rec.status === 'Late') {
                          badgeColor = 'bg-amber-100 text-amber-800 border border-amber-200';
                          Icon = Clock;
                        } else if (rec.status === 'Absent') {
                          badgeColor = 'bg-rose-100 text-rose-800 border border-rose-200';
                          Icon = XCircle;
                        } else if (rec.status === 'Excused') {
                          badgeColor = 'bg-blue-100 text-blue-800 border border-blue-200';
                          Icon = CheckCircle2;
                        }

                        const hasPendingDispute = rec.correction_status === 'Pending';
                        const hasApprovedDispute = rec.correction_status === 'Approved';

                        return (
                          <tr key={rec.record_id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                              {rec.date}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {rec.topic || 'Class Lecture'}
                              {rec.record_remarks && (
                                <p className="text-[10px] text-slate-400 italic">{rec.record_remarks}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${badgeColor}`}>
                                <Icon className="w-3.5 h-3.5" />
                                <span>{rec.status}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hasPendingDispute ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending Review</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setDisputingRecord(rec)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-indigo-700 hover:text-indigo-800 font-bold text-[11px] transition shadow-xs"
                                >
                                  Dispute Record
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setAuditingRecordId(rec.record_id)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                                title="View Record Audit Log"
                              >
                                <History className="w-4 h-4" />
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
          ) : activeTab === 'marks' ? (
            <div className="space-y-4">
              {(!subject.academics.assessments || subject.academics.assessments.length === 0) ? (
                <p className="text-center py-8 text-xs text-slate-400">No assessments recorded yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Assessment Title</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Weightage</th>
                        <th className="py-3 px-4 text-center">Marks Obtained</th>
                        <th className="py-3 px-4 text-center">Class Average</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subject.academics.assessments.map((ass) => {
                        const percent = ass.marks_obtained !== null && ass.max_marks > 0 
                          ? Math.round((ass.marks_obtained / ass.max_marks) * 100) 
                          : null;
                        const isPass = percent !== null && percent >= 40;

                        return (
                          <tr key={ass.assessment_id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {ass.title}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                                {ass.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {ass.date}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-700">
                              {ass.weightage}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              {ass.marks_obtained !== null ? (
                                <div className="inline-block">
                                  <span className={`font-black text-sm ${isPass ? 'text-indigo-600' : 'text-rose-600'}`}>
                                    {ass.marks_obtained}
                                  </span>
                                  <span className="text-slate-400 text-xs"> / {ass.max_marks}</span>
                                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    isPass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {percent}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Not graded</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600 font-mono">
                              {ass.class_avg ? `${Math.round(ass.class_avg * 10) / 10}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {ass.remarks || (percent && percent >= 80 ? 'Good work' : 'Satisfactory')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2">
              <AttendanceWhatIfSimulator
                subjectStats={[subject]}
                selectedSubjectId={subject.subjectId}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>

      {/* Child modals for dispute and audit */}
      {disputingRecord && (
        <AttendanceDisputeModal
          record={disputingRecord}
          onClose={() => setDisputingRecord(null)}
          onSubmitted={() => {
            fetchDetails();
          }}
        />
      )}

      {auditingRecordId && (
        <AttendanceAuditModal
          recordId={auditingRecordId}
          onClose={() => setAuditingRecordId(null)}
        />
      )}

    </div>
  );
}
