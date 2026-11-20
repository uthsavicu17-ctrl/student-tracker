import React, { useState, useEffect } from 'react';
import { correctionsAPI } from '../api';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar, 
  History,
  Filter,
  Check,
  X
} from 'lucide-react';
import AttendanceAuditModal from './AttendanceAuditModal';

export default function FacultyCorrectionsQueue({ onDecisionMade }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [activeDecisionModal, setActiveDecisionModal] = useState(null); // { type: 'approve' | 'reject', request: {...} }
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [auditingRecordId, setAuditingRecordId] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await correctionsAPI.getFacultyCorrections({ status: statusFilter });
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to load correction requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleOpenDecision = (type, req) => {
    setActiveDecisionModal({ type, request: req });
    setDecisionReason('');
    setError('');
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    if (!decisionReason.trim()) {
      setError('A decision reason is mandatory for official institutional auditing.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (activeDecisionModal.type === 'approve') {
        await correctionsAPI.approve(activeDecisionModal.request.request_id, decisionReason.trim());
      } else {
        await correctionsAPI.reject(activeDecisionModal.request.request_id, decisionReason.trim());
      }

      setActiveDecisionModal(null);
      fetchRequests();
      if (onDecisionMade) onDecisionMade();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Attendance Dispute & Correction Queue
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Review and adjudicate attendance discrepancy requests submitted by enrolled students.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200">
          {['Pending', 'Approved', 'Rejected', 'All'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                statusFilter === st
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading student dispute requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No {statusFilter} Correction Requests</h4>
          <p className="text-xs text-slate-400">
            {statusFilter === 'Pending' 
              ? 'All attendance dispute requests for your assigned courses have been resolved.' 
              : `No ${statusFilter.toLowerCase()} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const isPending = req.status === 'Pending';
            return (
              <div
                key={req.request_id}
                className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 transition ${
                  isPending ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Dispute #{req.request_id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {req.student_name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">({req.roll_number})</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      req.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {req.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Submitted: {new Date(req.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Dispute summary grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Subject & Session</span>
                    <p className="font-bold text-slate-800 mt-0.5">{req.subject_code} - {req.subject_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{req.lecture_date} • {req.lecture_topic || 'Class Lecture'}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Dispute Status Transition</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 text-[11px]">
                        {req.original_status}
                      </span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 text-[11px]">
                        {req.requested_status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Supporting Reference</span>
                    <p className="text-slate-700 text-[11px] italic mt-0.5">
                      {req.evidence_text || 'No document reference provided'}
                    </p>
                  </div>
                </div>

                {/* Student explanation */}
                <div className="text-xs space-y-1 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Student Explanation:</span>
                  <p className="text-slate-700 italic">"{req.student_reason}"</p>
                </div>

                {/* Decision outcome if already resolved */}
                {!isPending && (
                  <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Reviewed by: <strong>{req.reviewer_name || 'Faculty'}</strong></span>
                      <span className="font-mono">{new Date(req.decision_timestamp).toLocaleString()}</span>
                    </div>
                    <p className="font-bold text-slate-800">Faculty Decision Reason: <span className="font-normal italic">"{req.decision_reason}"</span></p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => setAuditingRecordId(req.attendance_record_id)}
                    className="inline-flex items-center space-x-1 font-bold text-slate-500 hover:text-slate-800"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Audit Trail</span>
                  </button>

                  {isPending && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenDecision('reject', req)}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject Dispute</span>
                      </button>

                      <button
                        onClick={() => handleOpenDecision('approve', req)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center space-x-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Update Attendance</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {activeDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`p-4 text-white font-bold text-sm flex items-center justify-between ${
              activeDecisionModal.type === 'approve' ? 'bg-emerald-700' : 'bg-rose-700'
            }`}>
              <span>
                {activeDecisionModal.type === 'approve' ? 'Approve Attendance Correction' : 'Reject Attendance Correction'}
              </span>
              <button onClick={() => setActiveDecisionModal(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecision} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {error}
                </div>
              )}

              <p className="text-slate-600">
                {activeDecisionModal.type === 'approve' ? (
                  <>
                    Approving this dispute will update <strong>{activeDecisionModal.request.student_name}</strong>'s attendance from <span className="font-bold text-rose-600">{activeDecisionModal.request.original_status}</span> to <span className="font-bold text-emerald-600">{activeDecisionModal.request.requested_status}</span> and recalculate eligibility statistics.
                  </>
                ) : (
                  <>
                    Rejecting this dispute will leave the official status as <span className="font-bold text-slate-800">{activeDecisionModal.request.original_status}</span> and record your explanation in the immutable audit log.
                  </>
                )}
              </p>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mandatory Decision Reason / Verification Note *
                </label>
                <textarea
                  rows="3"
                  required
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    activeDecisionModal.type === 'approve'
                      ? 'e.g. Verified student signature in lecture physical attendance sheet / Medical leave approved by HOD'
                      : 'e.g. Checked lecture recording; student was absent / OD request not sanctioned'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveDecisionModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-xl text-white font-bold transition disabled:opacity-50 ${
                    activeDecisionModal.type === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Recording Decision...' : activeDecisionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit modal */}
      {auditingRecordId && (
        <AttendanceAuditModal
          recordId={auditingRecordId}
          onClose={() => setAuditingRecordId(null)}
        />
      )}

    </div>
  );
}
