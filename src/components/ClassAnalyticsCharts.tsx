/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  BarChart3, TrendingUp, PieChart as LucidePieChart, CheckCircle2, 
  AlertCircle, Filter, Target, Award, Users, BookOpen, Layers,
  HelpCircle, Sparkles, Check, X
} from 'lucide-react';
import { Exam, StudentSession, QuestionType } from '../types';

interface ClassAnalyticsChartsProps {
  exams: Exam[];
  studentSessions: StudentSession[];
  classes: string[];
  initialClass?: string;
  initialSubject?: string;
}

export default function ClassAnalyticsCharts({
  exams,
  studentSessions,
  classes,
  initialClass = 'all',
  initialSubject = 'all'
}: ClassAnalyticsChartsProps) {
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [activeChartTab, setActiveChartTab] = useState<'class' | 'distribution' | 'passRate' | 'itemAnalysis'>('class');

  // List of unique subjects from exams
  const availableSubjects = useMemo(() => {
    const set = new Set(exams.map(e => e.subject));
    return Array.from(set);
  }, [exams]);

  // Filtered student sessions
  const filteredSessions = useMemo(() => {
    return studentSessions.filter(s => {
      if (!s.isSubmitted) return false;
      if (selectedClass !== 'all' && s.className !== selectedClass) return false;
      if (selectedSubject !== 'all' && s.subject !== selectedSubject) return false;
      return true;
    });
  }, [studentSessions, selectedClass, selectedSubject]);

  // Summary Metrics for filtered view
  const summaryMetrics = useMemo(() => {
    const total = filteredSessions.length;
    if (total === 0) {
      return {
        total: 0,
        avgScore: 0,
        passRate: 0,
        tuntasCount: 0,
        belumTuntasCount: 0,
        highestScore: 0,
        lowestScore: 0,
        avgKkm: 75
      };
    }

    let totalScore = 0;
    let tuntasCount = 0;
    let highestScore = 0;
    let lowestScore = 100;
    let totalKkm = 0;

    filteredSessions.forEach(s => {
      totalScore += s.finalScore;
      if (s.finalScore > highestScore) highestScore = s.finalScore;
      if (s.finalScore < lowestScore) lowestScore = s.finalScore;

      const exam = exams.find(e => e.id === s.examId);
      const kkm = exam ? exam.kkm : 75;
      totalKkm += kkm;
      if (s.finalScore >= kkm) {
        tuntasCount++;
      }
    });

    return {
      total,
      avgScore: Math.round(totalScore / total),
      passRate: Math.round((tuntasCount / total) * 100),
      tuntasCount,
      belumTuntasCount: total - tuntasCount,
      highestScore,
      lowestScore,
      avgKkm: Math.round(totalKkm / total) || 75
    };
  }, [filteredSessions, exams]);

  // 1. Data per Kelas (Class Comparison Data)
  const classComparisonData = useMemo(() => {
    return classes.map(cls => {
      const clsSessions = studentSessions.filter(s => {
        if (!s.isSubmitted) return false;
        if (s.className !== cls) return false;
        if (selectedSubject !== 'all' && s.subject !== selectedSubject) return false;
        return true;
      });

      const totalStudents = clsSessions.length;
      if (totalStudents === 0) {
        return {
          className: `Kelas ${cls}`,
          rawClass: cls,
          avgScore: 0,
          passRate: 0,
          totalStudents: 0,
          tuntasCount: 0,
          belumTuntasCount: 0,
          kkm: 75
        };
      }

      let totalScore = 0;
      let tuntasCount = 0;
      let totalKkm = 0;

      clsSessions.forEach(s => {
        totalScore += s.finalScore;
        const exam = exams.find(e => e.id === s.examId);
        const kkm = exam ? exam.kkm : 75;
        totalKkm += kkm;
        if (s.finalScore >= kkm) tuntasCount++;
      });

      return {
        className: `Kelas ${cls}`,
        rawClass: cls,
        avgScore: Math.round(totalScore / totalStudents),
        passRate: Math.round((tuntasCount / totalStudents) * 100),
        totalStudents,
        tuntasCount,
        belumTuntasCount: totalStudents - tuntasCount,
        kkm: Math.round(totalKkm / totalStudents) || 75
      };
    });
  }, [classes, studentSessions, exams, selectedSubject]);

  // 2. Data Distribusi Skor (Score Range Distribution Data)
  const scoreDistributionData = useMemo(() => {
    let range1 = 0; // < 60
    let range2 = 0; // 60 - 74
    let range3 = 0; // 75 - 84
    let range4 = 0; // 85 - 100

    filteredSessions.forEach(s => {
      if (s.finalScore < 60) range1++;
      else if (s.finalScore < 75) range2++;
      else if (s.finalScore < 85) range3++;
      else range4++;
    });

    const total = filteredSessions.length || 1;

    return [
      { range: '< 60 (Perlu Remedial)', count: range1, percent: Math.round((range1 / total) * 100), fill: '#ef4444' },
      { range: '60 - 74 (Hampir Tuntas)', count: range2, percent: Math.round((range2 / total) * 100), fill: '#f59e0b' },
      { range: '75 - 84 (Tuntas Baik)', count: range3, percent: Math.round((range3 / total) * 100), fill: '#3b82f6' },
      { range: '85 - 100 (Sangat Baik)', count: range4, percent: Math.round((range4 / total) * 100), fill: '#10b981' }
    ];
  }, [filteredSessions]);

  // 3. Data Status Kelulusan (Pass Rate Pie Chart Data)
  const passRatePieData = useMemo(() => {
    return [
      { name: 'Tuntas (Lulus KKM)', value: summaryMetrics.tuntasCount, color: '#10b981' },
      { name: 'Belum Tuntas', value: summaryMetrics.belumTuntasCount, color: '#ef4444' }
    ];
  }, [summaryMetrics]);

  // 4. Data Analisis Per Butir Soal (Item Accuracy Analysis)
  const questionItemAnalysis = useMemo(() => {
    // Find exam matching current filters
    const matchingExam = exams.find(e => {
      if (selectedClass !== 'all' && e.className !== selectedClass) return false;
      if (selectedSubject !== 'all' && e.subject !== selectedSubject) return false;
      return true;
    });

    if (!matchingExam || !matchingExam.questions || matchingExam.questions.length === 0) return [];

    const examSessions = studentSessions.filter(s => s.examId === matchingExam.id && s.isSubmitted);
    const totalSubmissions = examSessions.length;
    if (totalSubmissions === 0) return [];

    return matchingExam.questions.map((q, idx) => {
      let correctCount = 0;
      examSessions.forEach(s => {
        const studentAns = s.answers[q.id];
        if (q.type === QuestionType.PILIHAN_GANDA) {
          if (studentAns === q.correctAnswerIndex) correctCount++;
        } else if (q.type === QuestionType.PILIHAN_GANDA_KOMPLEKS) {
          if (Array.isArray(studentAns) && Array.isArray(q.correctAnswerIndices)) {
            const matchesAll = studentAns.length === q.correctAnswerIndices.length &&
              studentAns.every(v => q.correctAnswerIndices!.includes(v));
            if (matchesAll) correctCount++;
          }
        } else if (q.type === QuestionType.BENAR_SALAH) {
          if (studentAns === q.correctTrueFalse) correctCount++;
        } else if (q.type === QuestionType.MENJODOHKAN) {
          if (studentAns && q.matchingPairs) {
            let correctPairs = 0;
            q.matchingPairs.forEach(p => {
              if (studentAns[p.id] === p.response) correctPairs++;
            });
            if (correctPairs === q.matchingPairs.length) correctCount++;
          }
        } else if (q.type === QuestionType.ESSAY) {
          const scoreObj = s.essayScores[q.id];
          if (scoreObj && scoreObj.score >= 75) correctCount++;
        }
      });

      const accuracy = Math.round((correctCount / totalSubmissions) * 100);
      let difficulty = 'Sedang';
      let color = '#3b82f6';
      if (accuracy >= 80) {
        difficulty = 'Mudah';
        color = '#10b981';
      } else if (accuracy < 50) {
        difficulty = 'Sulit';
        color = '#f43f5e';
      }

      return {
        questionNum: `Soal #${idx + 1}`,
        accuracy,
        correctCount,
        incorrectCount: totalSubmissions - correctCount,
        difficulty,
        color,
        type: q.type,
        snippet: (q.questionText || '').length > 30 ? `${(q.questionText || '').substring(0, 30)}...` : (q.questionText || '')
      };
    });
  }, [exams, studentSessions, selectedClass, selectedSubject]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6" id="class-analytics-widget">
      
      {/* Widget Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Sparkles size={12} className="text-blue-500" />
            Evaluasi Performa Kelas & Statistik Ujian
          </div>
          <h3 className="text-base font-extrabold text-slate-900 font-sans flex items-center gap-2">
            Visualisasi Grafik Interaktif Hasil Ujian CAT
          </h3>
          <p className="text-xs text-slate-500">
            Analisis rerata nilai, persentase kelulusan KKM, dan peta ketepatan butir soal secara real-time.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-600">Filter:</span>
          </div>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="all">Semua Kelas</option>
            {classes.map(c => (
              <option key={c} value={c}>Kelas {c}</option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs max-w-[160px] truncate"
          >
            <option value="all">Semua Mapel</option>
            {availableSubjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid for Selected Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Rerata Nilai */}
        <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Rerata Nilai</span>
            <Target size={14} className="text-blue-500" />
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{summaryMetrics.avgScore}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              summaryMetrics.avgScore >= summaryMetrics.avgKkm 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              KKM: {summaryMetrics.avgKkm}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Rata-rata Skor Terfilter</p>
        </div>

        {/* Metric 2: Persentase Kelulusan */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-xl">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Tingkat Kelulusan</span>
            <CheckCircle2 size={14} className="text-emerald-600" />
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-900">{summaryMetrics.passRate}%</span>
          </div>
          <p className="text-[10px] text-emerald-700 font-medium mt-1">
            {summaryMetrics.tuntasCount} / {summaryMetrics.total} Siswa Tuntas
          </p>
        </div>

        {/* Metric 3: Score Range Max & Min */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-200/70 rounded-xl">
          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center justify-between">
            <span>Rentang Skor</span>
            <Award size={14} className="text-indigo-600" />
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xs font-bold text-slate-500">Max:</span>
            <span className="text-lg font-black text-indigo-950">{summaryMetrics.highestScore}</span>
            <span className="text-xs font-bold text-slate-400">|</span>
            <span className="text-xs font-bold text-slate-500">Min:</span>
            <span className="text-lg font-black text-slate-700">{summaryMetrics.lowestScore}</span>
          </div>
          <p className="text-[10px] text-indigo-700 font-medium mt-1">Nilai Tertinggi & Terendah</p>
        </div>

        {/* Metric 4: Total Submisi */}
        <div className="p-4 bg-violet-50/50 border border-violet-200/70 rounded-xl">
          <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider flex items-center justify-between">
            <span>Siswa Dievaluasi</span>
            <Users size={14} className="text-violet-600" />
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-violet-950">{summaryMetrics.total}</span>
            <span className="text-xs font-bold text-violet-700">Siswa</span>
          </div>
          <p className="text-[10px] text-violet-700 font-medium mt-1">Telah Mengumpulkan Jawaban</p>
        </div>
      </div>

      {/* View Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveChartTab('class')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeChartTab === 'class'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BarChart3 size={14} />
          <span>Rerata & KKM per Kelas</span>
        </button>

        <button
          onClick={() => setActiveChartTab('distribution')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeChartTab === 'distribution'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp size={14} />
          <span>Distribusi Rentang Nilai</span>
        </button>

        <button
          onClick={() => setActiveChartTab('passRate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeChartTab === 'passRate'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <LucidePieChart size={14} />
          <span>Status Kelulusan (Pie)</span>
        </button>

        <button
          onClick={() => setActiveChartTab('itemAnalysis')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeChartTab === 'itemAnalysis'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BookOpen size={14} />
          <span>Analisis Ketepatan Soal</span>
        </button>
      </div>

      {/* Chart Display Container */}
      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 min-h-[320px] flex flex-col justify-between">
        
        {/* CHART 1: Rerata & KKM per Kelas */}
        {activeChartTab === 'class' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-blue-600" />
                  Grafik Komparasi Rata-rata Nilai & KKM per Kelas
                </h4>
                <p className="text-[11px] text-slate-500">Membandingkan performa antar kelas terhadap target KKM.</p>
              </div>
            </div>

            <div className="h-72 w-full">
              {classComparisonData.every(d => d.totalStudents === 0) ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Belum ada data pengerjaan ujian untuk filter yang dipilih.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="className" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value, name) => [
                        name === 'passRate' ? `${value}%` : `${value} Poin`, 
                        name === 'avgScore' ? 'Rerata Nilai' : name === 'kkm' ? 'Target KKM' : 'Persentase Kelulusan'
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar name="Rerata Nilai Kelas" dataKey="avgScore" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar name="Target KKM" dataKey="kkm" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar name="Tingkat Kelulusan (%)" dataKey="passRate" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* CHART 2: Distribusi Rentang Nilai */}
        {activeChartTab === 'distribution' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-amber-500" />
                  Grafik Distribusi Kategori Nilai Siswa
                </h4>
                <p className="text-[11px] text-slate-500">Pemetaan jumlah siswa berdasarkan rentang capaian skor.</p>
              </div>
            </div>

            <div className="h-72 w-full">
              {filteredSessions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Belum ada data pengerjaan ujian untuk filter yang dipilih.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistributionData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                      formatter={(value) => [`${value} Siswa`, 'Jumlah Siswa']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={42}>
                      {scoreDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* CHART 3: Status Kelulusan Pie / Donut */}
        {activeChartTab === 'passRate' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <LucidePieChart size={15} className="text-indigo-500" />
                  Grafik Rasio Kelulusan Siswa (Tuntas KKM vs Belum Tuntas)
                </h4>
                <p className="text-[11px] text-slate-500">Proporsi siswa yang berhasil mencapai KKM.</p>
              </div>
            </div>

            <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-center gap-6">
              {filteredSessions.length === 0 ? (
                <div className="text-slate-400 text-xs italic">
                  Belum ada data pengerjaan ujian untuk filter yang dipilih.
                </div>
              ) : (
                <>
                  <div className="h-60 w-60 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={passRatePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {passRatePieData.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} Siswa`, 'Jumlah']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center leading-tight pointer-events-none">
                      <p className="text-3xl font-black text-slate-900">{summaryMetrics.passRate}%</p>
                      <p className="text-[9px] text-emerald-600 uppercase font-bold tracking-wider">Lulus KKM</p>
                    </div>
                  </div>

                  {/* Pie Legend Details */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 min-w-[200px]">
                    <p className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">Detail Proporsi:</p>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-2 text-emerald-700">
                        <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                        Tuntas KKM:
                      </span>
                      <span className="font-mono font-bold text-slate-900">{summaryMetrics.tuntasCount} Siswa</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-2 text-rose-700">
                        <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                        Belum Tuntas:
                      </span>
                      <span className="font-mono font-bold text-slate-900">{summaryMetrics.belumTuntasCount} Siswa</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Total Peserta:</span>
                      <span className="font-mono text-slate-900">{summaryMetrics.total} Siswa</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CHART 4: Analisis Ketepatan Soal (Item Difficulty) */}
        {activeChartTab === 'itemAnalysis' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen size={15} className="text-emerald-600" />
                  Grafik Analisis Ketepatan Jawaban per Nomor Soal (%)
                </h4>
                <p className="text-[11px] text-slate-500">Persentase siswa yang menjawab dengan benar pada masing-masing nomor soal.</p>
              </div>
            </div>

            <div className="h-72 w-full">
              {questionItemAnalysis.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Pilih spesifik Mata Pelajaran / Ujian untuk melihat analisis ketepatan per butir soal.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={questionItemAnalysis} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="questionNum" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                      formatter={(value) => [`${value}% Benar`, 'Tingkat Ketepatan']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar name="Tingkat Ketepatan (%)" dataKey="accuracy" radius={[4, 4, 0, 0]} barSize={24}>
                      {questionItemAnalysis.map((entry, index) => (
                        <Cell key={`item-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Automatic Evaluative Recommendations */}
      <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-3">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
          <HelpCircle size={16} />
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-bold text-blue-900">Rekomendasi Tindak Lanjut Evaluasi Pembelajaran:</p>
          <ul className="list-disc list-inside text-blue-800/90 space-y-1 leading-relaxed">
            {summaryMetrics.passRate >= 80 ? (
              <li>Performa kelas sangat memuaskan dengan persentase kelulusan <span className="font-bold">{summaryMetrics.passRate}%</span>. Pembelajaran dapat dilanjutkan ke materi pengayaan berikutnya.</li>
            ) : summaryMetrics.passRate >= 60 ? (
              <li>Terdapat <span className="font-bold">{summaryMetrics.belumTuntasCount} siswa</span> yang belum mencapai KKM. Direkomendasikan program remedial terbatas untuk topik spesifik.</li>
            ) : (
              <li>Tingkat kelulusan kelas masih di bawah standar (<span className="font-bold">{summaryMetrics.passRate}%</span>). Disarankan melakukan evaluasi ulang terhadap butir soal dan pengulangan materi.</li>
            )}
            {questionItemAnalysis.some(q => q.accuracy < 50) && (
              <li>Soal dengan tingkat ketepatan &lt; 50% memerlukan pembahasan kelas bersama siswa.</li>
            )}
          </ul>
        </div>
      </div>

    </div>
  );
}
