import React, { useState, useEffect } from 'react';
import { uciAPI } from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  Database,
  ExternalLink,
  Info,
  BookOpen,
  Filter,
  Search,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function UciDatasetExplorer() {
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'browser' | 'metadata'
  const [metadata, setMetadata] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [selectedSex, setSelectedSex] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'browser') {
      loadRecords();
    }
  }, [page, selectedSubject, selectedSchool, selectedSex, activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metaRes, analyticsRes] = await Promise.all([
        uciAPI.getMetadata(),
        uciAPI.getAnalytics()
      ]);
      setMetadata(metaRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Failed to load UCI dataset information:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      const res = await uciAPI.getRecords({
        page,
        limit: 15,
        subject: selectedSubject,
        school: selectedSchool,
        sex: selectedSex,
        search: searchTerm
      });
      setRecords(res.data.records || []);
      setTotalRecords(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load UCI records:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecords();
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Querying UCI Student Performance Repository...</p>
      </div>
    );
  }

  // Chart 1: Study Time vs Final Grade
  const studyTimeChart = {
    labels: analytics?.studyTimeEffect?.map(s => s.studytime_label) || [],
    datasets: [
      {
        label: 'Average Final Grade G3 (Scale 0-20)',
        data: analytics?.studyTimeEffect?.map(s => s.avg_final_grade) || [],
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 8
      }
    ]
  };

  // Chart 2: Failure Impact vs Final Grade
  const failureChart = {
    labels: analytics?.failureImpact?.map(f => `${f.failures} Past Failures`) || [],
    datasets: [
      {
        label: 'Average Final Grade G3 (0-20)',
        data: analytics?.failureImpact?.map(f => f.avg_final_grade) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderRadius: 8
      }
    ]
  };

  return (
    <div className="space-y-6">
      
      {/* Dataset Provenance Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-400/20">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>UCI Machine Learning Repository Benchmark</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            UCI Student Performance Dataset (Cortez & Silva, 2008)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Integrated educational dataset analyzing student achievement in secondary education of two Portuguese schools (Gabriel Pereira & Mousinho da Silveira).
          </p>
        </div>

        <a
          href="https://archive.ics.uci.edu/dataset/320/student+performance"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition whitespace-nowrap text-slate-200"
        >
          <span>Official UCI Source</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
        </a>
      </div>

      {/* Critical Limitations Callout */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
        <div className="flex items-center space-x-2 font-bold">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Scientific Distinction Between UCI Dataset and Operational EduTrack Data</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          The records below represent the genuine public dataset. The variable <strong>absences</strong> represents total aggregate missed school days (0–93) over the academic period, <em>not</em> lecture-by-lecture attendance sessions. Course period grades <strong>G1, G2, G3</strong> are evaluated on a 0–20 scale, <em>not</em> college internal marks or college CGPA. Operational EduTrack attendance and internal marks are managed separately.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        {[
          { id: 'analytics', label: 'Empirical Visualizations & Analytics' },
          { id: 'browser', label: `Raw Dataset Records (${metadata?.counts?.totalRows || 1044})` },
          { id: 'metadata', label: 'Dataset Metadata & Attribution' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: ANALYTICS & CHARTS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[11px] font-bold uppercase text-slate-400">Total Enrolled Rows</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{metadata?.counts?.totalRows || 1044}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">395 Math + 649 Portuguese</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[11px] font-bold uppercase text-slate-400">Overlapping Students</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{metadata?.counts?.overlappingStudents || 56}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">In both Math & Portuguese</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[11px] font-bold uppercase text-slate-400">Math Course Pass Rate</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">67.1%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">G3 ≥ 10 on 0-20 scale</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[11px] font-bold uppercase text-slate-400">Portuguese Pass Rate</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">84.6%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">G3 ≥ 10 on 0-20 scale</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Study Time vs G3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Study Time vs Final Grade (G3)</h4>
                <p className="text-xs text-slate-500">Correlation between weekly study hours and academic achievement</p>
              </div>
              <div className="h-60">
                <Bar 
                  data={studyTimeChart} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true, max: 20, ticks: { callback: v => `${v}/20` } }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Chart 2: Failures vs G3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Past Class Failures vs Final Grade (G3)</h4>
                <p className="text-xs text-slate-500">Impact of historical academic failure on current performance</p>
              </div>
              <div className="h-60">
                <Bar 
                  data={failureChart} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true, max: 20, ticks: { callback: v => `${v}/20` } }
                    }
                  }} 
                />
              </div>
            </div>

          </div>

          {/* Subject Comparison Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-800 text-sm">Mathematics vs Portuguese Empirical Comparison</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4 text-center">Enrolled Students</th>
                    <th className="py-2.5 px-4 text-center">Avg G1</th>
                    <th className="py-2.5 px-4 text-center">Avg G2</th>
                    <th className="py-2.5 px-4 text-center">Avg G3 (Final)</th>
                    <th className="py-2.5 px-4 text-center">Avg Absences</th>
                    <th className="py-2.5 px-4 text-center">Pass Rate (G3 ≥ 10)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics?.subjectAverages?.map(s => (
                    <tr key={s.subject} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{s.subject}</td>
                      <td className="py-2.5 px-4 text-center text-slate-600">{s.total_students}</td>
                      <td className="py-2.5 px-4 text-center font-mono">{s.avg_g1}</td>
                      <td className="py-2.5 px-4 text-center font-mono">{s.avg_g2}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-indigo-600">{s.avg_g3} / 20</td>
                      <td className="py-2.5 px-4 text-center text-rose-600 font-bold">{s.avg_absences} days</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                          {Math.round(s.pass_rate)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: RAW RECORD BROWSER */}
      {activeSubTab === 'browser' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-800"
              >
                <option value="All">All Subjects (Math & Por)</option>
                <option value="Mathematics">Mathematics (395)</option>
                <option value="Portuguese">Portuguese (649)</option>
              </select>

              <select
                value={selectedSchool}
                onChange={(e) => { setSelectedSchool(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-800"
              >
                <option value="All">All Schools (GP & MS)</option>
                <option value="GP">GP (Gabriel Pereira)</option>
                <option value="MS">MS (Mousinho da Silveira)</option>
              </select>

              <select
                value={selectedSex}
                onChange={(e) => { setSelectedSex(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-800"
              >
                <option value="All">All Sex (F & M)</option>
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ID, Job..."
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Filter
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Composite ID</th>
                  <th className="py-2.5 px-4 text-center">School</th>
                  <th className="py-2.5 px-4 text-center">Sex/Age</th>
                  <th className="py-2.5 px-4 text-center">Study Time</th>
                  <th className="py-2.5 px-4 text-center">Failures</th>
                  <th className="py-2.5 px-4 text-center">Absences</th>
                  <th className="py-2.5 px-4 text-center">G1</th>
                  <th className="py-2.5 px-4 text-center">G2</th>
                  <th className="py-2.5 px-4 text-center">G3 (Final)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.subject === 'Mathematics' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {rec.subject}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                      {rec.student_composite_id}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-700">{rec.school}</td>
                    <td className="py-2.5 px-4 text-center text-slate-600">{rec.sex} • {rec.age}y</td>
                    <td className="py-2.5 px-4 text-center text-slate-700">Lvl {rec.studytime}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-rose-600">{rec.failures}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-800">{rec.absences}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{rec.g1}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-600">{rec.g2}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-black text-indigo-600">{rec.g3} / 20</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-500">
              Showing page {page} of {totalPages} ({totalRecords} records)
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 3: METADATA & DOCUMENTATION */}
      {activeSubTab === 'metadata' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h4 className="font-bold text-slate-800 text-sm">Dataset Metadata & Attribution Details</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Source Title</p>
              <p className="font-bold text-slate-900 text-sm">{metadata?.metadata?.name}</p>
              <p className="text-slate-500">{metadata?.metadata?.description}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">License & Citation</p>
              <p className="font-bold text-emerald-700">{metadata?.metadata?.license}</p>
              <p className="text-slate-500">
                Cortez, P., & Silva, A. (2008). Using Data Mining to Predict Secondary School Student Performance. In Proceedings of 5th FUBUTEC, pp. 5-12.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Technical Ingestion Rules & Data Dictionary Summary</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Math Source File: <code className="font-bold text-slate-800">student-mat.csv</code> (395 records)</li>
              <li>Portuguese Source File: <code className="font-bold text-slate-800">student-por.csv</code> (649 records)</li>
              <li>Delimiter: Semicolon (;) with double-quoted strings</li>
              <li>Imported into SQLite table <code className="font-bold text-indigo-700">uci_student_records</code> with 100% preservation of all 33 original attributes</li>
              <li>Overlap linkage: Preserved using deterministic 13-attribute composite hash according to Cortez & Silva (2008).</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
