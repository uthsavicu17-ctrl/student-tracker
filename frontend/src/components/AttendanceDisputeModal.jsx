import React, { useState } from 'react';
import { correctionsAPI } from '../api';
import { X, ShieldAlert, AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';

export default function AttendanceDisputeModal({ record, onClose, onSubmitted }) {
  const [requestedStatus, setRequestedStatus] = useState(
    record.status === 'Absent' ? 'Present' : (record.status === 'Late' ? 'Present' : 'Excused')
  );
  const [reason, setReason] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a clear reason for the attendance dispute.');
      return;
    }

    if (requestedStatus === record.status) {
      setError(`Record is already marked as ${record.status}. Select a different requested status.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await correctionsAPI.submit({
        attendance_record_id: record.record_id,
        requested_status: requestedStatus,
        reason: reason.trim(),
        evidence_text: evidenceText.trim()
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit correction request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-blue-200" />
            <div>
              <h2 className="text-base font-bold">Attendance Dispute & Correction Request</h2>
              <p className="text-[11px] text-blue-200">Official institutional correction workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Dispute Submitted Successfully</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your request has been forwarded to course instructor <strong>{record.faculty_name || 'Faculty'}</strong> for review. An audit event has been recorded.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Session snapshot details (read only) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-slate-800">
                <span>{record.subject_code} - {record.subject_name}</span>
                <span className="font-mono text-slate-500">{record.date}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Topic: <strong className="text-slate-700">{record.topic || 'Class Lecture'}</strong> • Instructor: {record.faculty_name}
              </p>
              <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500">Recorded Official Status:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  record.status === 'Absent' ? 'bg-rose-100 text-rose-800' :
                  record.status === 'Late' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                }`}>
                  {record.status}
                </span>
              </div>
            </div>

            {/* Requested Status */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Requested Corrected Status *
              </label>
              <select
                value={requestedStatus}
                onChange={(e) => setRequestedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Present">Present (I was in attendance during this lecture)</option>
                <option value="Late">Late (I was present but arrived late; marked absent incorrectly)</option>
                <option value="Excused">Excused (Authorized On-Duty / Medical Leave granted)</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Dispute *
              </label>
              <textarea
                rows="3"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the circumstance (e.g. Attended lecture in 2nd row; professor missed roll call / Represented college in inter-collegiate symposium / Medical permit granted)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Supporting evidence */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supporting Reference / Document Note (Optional)
              </label>
              <input
                type="text"
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                placeholder="e.g. Approved OD Form Ref #CSE-OD-2026-42 or Medical Certificate Date"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-50"
              >
                {loading ? 'Submitting Dispute...' : 'Submit Correction Request'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
