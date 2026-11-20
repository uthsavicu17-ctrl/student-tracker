import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  ArrowRight,
  ShieldAlert,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

export default function AttendanceWhatIfSimulator({ subjectStats = [], selectedSubjectId, onSubjectChange }) {
  // Active subject or hypothetical mode
  const [activeSubjectId, setActiveSubjectId] = useState(selectedSubjectId || (subjectStats[0]?.subjectId || 'custom'));
  const [threshold, setThreshold] = useState(75.0);

  // Simulation levers: future classes
  const [futureAttended, setFutureAttended] = useState(0);
  const [futureMissed, setFutureMissed] = useState(0);

  // Custom hypothetical starting numbers (when in custom mode or missing data)
  const [customAttended, setCustomAttended] = useState(7);
  const [customTotal, setCustomTotal] = useState(12);
  const [customRemaining, setCustomRemaining] = useState(28);

  useEffect(() => {
    if (selectedSubjectId) {
      setActiveSubjectId(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  const isCustomMode = activeSubjectId === 'custom' || subjectStats.length === 0;
  const currentSub = subjectStats.find(s => s.subjectId === parseInt(activeSubjectId, 10));

  // Determine baseline variables:
  // A = attended eligible lectures (Present + 0.5*Late + Excused)
  // T = total completed eligible lectures
  // R = remaining lectures planned
  let A = 0;
  let T = 0;
  let R = 0;
  let subjectName = 'Custom Scenario';
  let subjectCode = 'SIM-101';

  if (!isCustomMode && currentSub) {
    A = currentSub.attendance.effectiveAttended ?? (currentSub.attendance.present + currentSub.attendance.late * 0.5 + currentSub.attendance.excused);
    T = currentSub.attendance.totalSessions;
    R = currentSub.remainingClasses ?? Math.max(0, (currentSub.plannedClasses || 40) - T);
    subjectName = currentSub.subjectName;
    subjectCode = currentSub.subjectCode;
  } else {
    A = parseFloat(customAttended) || 0;
    T = parseFloat(customTotal) || 0;
    R = parseFloat(customRemaining) || 0;
  }

  const p = threshold / 100.0; // Target attendance fraction

  // 1. Current Attendance %
  const currentPercentage = T > 0 ? Math.round((A / T) * 100 * 10) / 10 : 0;
  const hasZeroSessions = T === 0;

  // 2. Projected Attendance % with simulated levers: C = futureAttended, M = futureMissed
  const C = Math.max(0, parseInt(futureAttended, 10) || 0);
  const M = Math.max(0, parseInt(futureMissed, 10) || 0);
  const simulatedDenominator = T + C + M;
  const projectedPercentage = simulatedDenominator > 0 
    ? Math.round(((A + C) / simulatedDenominator) * 100 * 10) / 10 
    : 0;

  // 3. Consecutive Lectures needed to cross threshold without missing any further class:
  // Formula: n = ceil((p * T - A) / (1 - p))
  let consecutiveNeeded = 0;
  if (!hasZeroSessions && currentPercentage < threshold) {
    consecutiveNeeded = Math.ceil((p * T - A) / (1.0 - p));
    if (consecutiveNeeded < 0) consecutiveNeeded = 0;
    // Verify against (A + n)/(T + n) >= p
    while ((A + consecutiveNeeded) / (T + consecutiveNeeded) < (p - 1e-6)) {
      consecutiveNeeded++;
    }
  }

  // 4. Maximum achievable attendance by semester end if attending all remaining R classes:
  const maxPossibleSessions = T + R;
  const maxAchievablePercentage = maxPossibleSessions > 0
    ? Math.round(((A + R) / maxPossibleSessions) * 100 * 10) / 10
    : 0;

  // 5. Semester-End Feasibility Categorization:
  let feasibilityStatus = 'TARGET_ACHIEVED';
  let feasibilityBadge = { label: 'Target Met', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };

  if (hasZeroSessions) {
    feasibilityStatus = 'INSUFFICIENT_DATA';
    feasibilityBadge = { label: 'No Sessions Logged Yet', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  } else if (currentPercentage >= threshold) {
    feasibilityStatus = 'TARGET_ACHIEVED';
    feasibilityBadge = { label: 'Eligible (≥ 75%)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  } else if (R <= 0) {
    feasibilityStatus = 'NO_CLASSES_REMAINING';
    feasibilityBadge = { label: 'Semester Over — Cannot Recover', color: 'bg-rose-100 text-rose-800 border-rose-200' };
  } else if (consecutiveNeeded > R) {
    feasibilityStatus = 'MATHEMATICALLY_UNATTAINABLE';
    feasibilityBadge = { label: 'Mathematically Unattainable', color: 'bg-rose-100 text-rose-800 border-rose-200' };
  } else if (consecutiveNeeded === R) {
    feasibilityStatus = 'ALL_REMAINING_REQUIRED';
    feasibilityBadge = { label: 'Must Attend 100% of Remaining', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  } else {
    feasibilityStatus = 'RECOVERABLE';
    feasibilityBadge = { label: 'Recoverable with Attendance', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  }

  // Preset quick simulation actions
  const applyPreset = (addC, addM) => {
    setFutureAttended(prev => Math.max(0, prev + addC));
    setFutureMissed(prev => Math.max(0, prev + addM));
  };

  const resetSimulation = () => {
    setFutureAttended(0);
    setFutureMissed(0);
  };

  // Scenario 1: Miss Tomorrow (+1 Missed)
  const missTomorrowPct = (T + 1) > 0 ? Math.round((A / (T + 1)) * 100 * 10) / 10 : 0;
  // Scenario 2: Attend Tomorrow (+1 Attended)
  const attendTomorrowPct = (T + 1) > 0 ? Math.round(((A + 1) / (T + 1)) * 100 * 10) / 10 : 0;
  // Scenario 3: Attend All Remaining R classes
  const attendAllPct = maxAchievablePercentage;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            <span>Interactive Decision Support Simulator</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Attendance What-If Simulator
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Explore how your future attendance choices could affect your semester exam eligibility.
          </p>
        </div>

        {/* Subject dropdown + Threshold control */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Simulated Course:
            </label>
            <select
              value={activeSubjectId}
              onChange={(e) => {
                setActiveSubjectId(e.target.value);
                if (onSubjectChange) onSubjectChange(e.target.value);
                resetSimulation();
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {subjectStats.map(s => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectCode} - {s.subjectName} ({s.attendance.percentage}%)
                </option>
              ))}
              <option value="custom">⚙️ Custom / Hypothetical Scenario</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Target Threshold:
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="50"
                max="95"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 75)}
                className="w-16 px-2.5 py-2 rounded-xl border border-slate-300 font-black text-center text-xs text-slate-800"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom hypothetical inputs if selected */}
      {isCustomMode && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-3">
          <div className="flex items-center space-x-2 text-amber-900 font-bold">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Hypothetical Baseline Parameters (Not saved to historical database)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Attended Classes (A):</label>
              <input
                type="number"
                min="0"
                value={customAttended}
                onChange={(e) => setCustomAttended(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Total Completed Classes (T):</label>
              <input
                type="number"
                min="0"
                value={customTotal}
                onChange={(e) => setCustomTotal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Planned Remaining Classes (R):</label>
              <input
                type="number"
                min="0"
                value={customRemaining}
                onChange={(e) => setCustomRemaining(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-bold bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Answer Cards to the 3 Core Questions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Question 1: What happens if I miss tomorrow's class? */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Question 1</p>
            <h3 className="font-extrabold text-slate-800 text-sm">What happens if I miss tomorrow's class?</h3>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black ${missTomorrowPct >= threshold ? 'text-slate-800' : 'text-rose-600'}`}>
                {missTomorrowPct}%
              </span>
              <span className="text-xs font-bold text-rose-500 flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                -{(Math.round((currentPercentage - missTomorrowPct) * 10) / 10)}% drop
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Attendance would change from {currentPercentage}% to {missTomorrowPct}%.
            </p>
          </div>

          <button
            onClick={() => applyPreset(0, 1)}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-xs text-rose-700 transition"
          >
            Simulate Missing Tomorrow
          </button>
        </div>

        {/* Question 2: How many consecutive classes must I attend to reach 75%? */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Question 2</p>
            <h3 className="font-extrabold text-slate-800 text-sm">Consecutive classes needed to reach {threshold}%?</h3>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black ${consecutiveNeeded === 0 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {consecutiveNeeded === 0 ? '0 (Already ≥ 75%)' : `${consecutiveNeeded} Classes`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {consecutiveNeeded === 0 
                ? 'Your current attendance satisfies the institutional criterion.' 
                : `Must attend next ${consecutiveNeeded} lectures without absence to reach ${threshold}%.`}
            </p>
          </div>

          <button
            onClick={() => applyPreset(consecutiveNeeded, 0)}
            disabled={consecutiveNeeded === 0}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-xs text-indigo-700 transition disabled:opacity-50"
          >
            Simulate Attending {consecutiveNeeded} Classes
          </button>
        </div>

        {/* Question 3: Can I reach the attendance target before semester ends? */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Question 3</p>
            <h3 className="font-extrabold text-slate-800 text-sm">Can I reach target by semester end?</h3>
          </div>

          <div className="space-y-1">
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${feasibilityBadge.color}`}>
              {feasibilityBadge.label}
            </span>
            <p className="text-[11px] text-slate-500 pt-1">
              Max achievable: <strong>{maxAchievablePercentage}%</strong> ({R} remaining planned classes).
            </p>
          </div>

          <button
            onClick={() => applyPreset(R, 0)}
            disabled={R === 0}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-xs text-blue-700 transition disabled:opacity-50"
          >
            Simulate Attending All {R} Remaining
          </button>
        </div>

      </div>

      {/* Interactive Simulation Console (Levers) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white space-y-6 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Interactive Simulation Console: Custom Scenario</span>
            </h3>
            <p className="text-xs text-slate-300">
              Adjust upcoming lectures to attend or miss to observe real-time projected outcomes.
            </p>
          </div>

          {(C > 0 || M > 0) && (
            <button
              onClick={resetSimulation}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition text-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Levers</span>
            </button>
          )}
        </div>

        {/* Sliders & Levers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-300">Upcoming Lectures Attended (+C):</span>
              <span className="font-mono font-black text-base text-emerald-400">+{C}</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(30, R)}
              value={C}
              onChange={(e) => setFutureAttended(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex space-x-1.5 pt-1">
              {[1, 3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => applyPreset(n, 0)}
                  className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-bold text-emerald-300 transition"
                >
                  +{n} Attended
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-rose-300">Upcoming Lectures Missed (+M):</span>
              <span className="font-mono font-black text-base text-rose-400">+{M}</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(20, R)}
              value={M}
              onChange={(e) => setFutureMissed(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex space-x-1.5 pt-1">
              {[1, 2, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => applyPreset(0, n)}
                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[11px] font-bold text-rose-300 transition"
                >
                  +{n} Missed
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projected Outcome Banner */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-bold">
              Projected Final Eligibility
            </p>
            <div className="flex items-center space-x-3">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-sm text-slate-300 font-semibold">{currentPercentage}%</span>
                <ArrowRight className="w-4 h-4 text-slate-400 inline" />
                <span className={`text-3xl font-black ${projectedPercentage >= threshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {projectedPercentage}%
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                projectedPercentage >= threshold ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}>
                {projectedPercentage >= threshold ? '✓ Eligible for Exam' : '⚠️ Disbarred / Need Condonation'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Based on {A + C} attended of {simulatedDenominator} lectures. Target threshold: {threshold}%.
            </p>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Mathematical Recommendation:</span>
            <p className="text-xs text-white font-medium max-w-xs">
              {projectedPercentage >= threshold 
                ? 'Under this scenario, your attendance remains safely above institutional threshold.' 
                : `You are projected to be ${(Math.round((threshold - projectedPercentage) * 10) / 10)}% short. Attend more classes or submit valid OD/Medical dispute.`}
            </p>
          </div>
        </div>

      </div>

      {/* Scenario Comparison Matrix */}
      <div className="space-y-3 pt-2">
        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
          Multi-Scenario Comparison Matrix
        </h4>
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <th className="py-2.5 px-4">Scenario</th>
                <th className="py-2.5 px-4 text-center">Attended / Total</th>
                <th className="py-2.5 px-4 text-center">Projected %</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4">Implication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-white">
                <td className="py-2.5 px-4 font-bold text-slate-900">Baseline (Current Record)</td>
                <td className="py-2.5 px-4 text-center text-slate-600">{A} / {T}</td>
                <td className="py-2.5 px-4 text-center font-bold text-slate-800">{currentPercentage}%</td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    currentPercentage >= threshold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {currentPercentage >= threshold ? 'Safe' : 'At-Risk'}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-500 text-[11px]">Present historical state</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2.5 px-4 font-bold text-slate-900">Miss Tomorrow's Class</td>
                <td className="py-2.5 px-4 text-center text-slate-600">{A} / {T + 1}</td>
                <td className="py-2.5 px-4 text-center font-bold text-rose-600">{missTomorrowPct}%</td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    missTomorrowPct >= threshold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {missTomorrowPct >= threshold ? 'Safe' : 'At-Risk'}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-500 text-[11px]">Causes immediate percentage decrease</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2.5 px-4 font-bold text-slate-900">Attend Tomorrow's Class</td>
                <td className="py-2.5 px-4 text-center text-slate-600">{A + 1} / {T + 1}</td>
                <td className="py-2.5 px-4 text-center font-bold text-emerald-600">{attendTomorrowPct}%</td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    attendTomorrowPct >= threshold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {attendTomorrowPct >= threshold ? 'Safe' : 'At-Risk'}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-500 text-[11px]">Incremental progress toward threshold</td>
              </tr>
              <tr className="bg-white">
                <td className="py-2.5 px-4 font-bold text-slate-900">Attend All Remaining ({R} classes)</td>
                <td className="py-2.5 px-4 text-center text-slate-600">{A + R} / {T + R}</td>
                <td className="py-2.5 px-4 text-center font-bold text-indigo-600">{maxAchievablePercentage}%</td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    maxAchievablePercentage >= threshold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {maxAchievablePercentage >= threshold ? 'Target Reached' : 'Unattainable'}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-500 text-[11px]">Maximum theoretical upper bound by semester end</td>
              </tr>
              {(C > 0 || M > 0) && (
                <tr className="bg-indigo-50/60 font-semibold">
                  <td className="py-2.5 px-4 font-bold text-indigo-900">Custom Console Scenario (+{C} / -{M})</td>
                  <td className="py-2.5 px-4 text-center text-indigo-950">{A + C} / {simulatedDenominator}</td>
                  <td className="py-2.5 px-4 text-center font-black text-indigo-700">{projectedPercentage}%</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      projectedPercentage >= threshold ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {projectedPercentage >= threshold ? 'Eligible' : 'At-Risk'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-indigo-900 text-[11px]">User-manipulated lever values</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
