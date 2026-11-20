import React, { useState, useEffect } from 'react';
import { correctionsAPI } from '../api';
import { X, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle, User } from 'lucide-react';

export default function AttendanceAuditModal({ recordId, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAudit() {
      setLoading(true);
      try {
        const res = await correctionsAPI.getAuditHistory(recordId);
        setEvents(res.data.events || []);
      } catch (err) {
        console.error('Failed to load audit history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, [recordId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">Attendance Record Audit Trail</h2>
              <p className="text-[11px] text-slate-300">Immutable ledger of state transitions & dispute decisions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading audit timeline...
            </div>
          ) : events.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No audit events recorded for this session yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {events.map((ev) => {
                let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                let Icon = Clock;
                if (ev.event_type === 'CORRECTION_APPROVED') {
                  badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  Icon = CheckCircle2;
                } else if (ev.event_type === 'CORRECTION_REJECTED') {
                  badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                  Icon = XCircle;
                } else if (ev.event_type === 'CORRECTION_REQUESTED') {
                  badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  Icon = AlertCircle;
                }

                return (
                  <div key={ev.id} className="relative space-y-1 text-xs">
                    <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-[10px]">
                      <Icon className="w-3 h-3 text-indigo-600" />
                    </span>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${badgeColor}`}>
                        {ev.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <p className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>By: <strong>{ev.acting_user_name || 'System User'}</strong> ({ev.acting_role})</span>
                      </p>
                      {ev.previous_status && ev.new_status && (
                        <p className="text-slate-800 font-bold">
                          Status Transition: <span className="font-mono text-slate-500">{ev.previous_status}</span> ➔ <span className="font-mono text-emerald-600">{ev.new_status}</span>
                        </p>
                      )}
                      <p className="text-slate-600 text-[11px] italic">
                        "{ev.reason}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
