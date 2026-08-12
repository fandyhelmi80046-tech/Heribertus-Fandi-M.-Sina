/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  HardDrive, Database, Server, RefreshCw, AlertTriangle, CheckCircle2, 
  FileText, Users, ShieldAlert, Cpu, Sparkles, ArrowUpRight, Info, Layers
} from 'lucide-react';
import { Exam, StudentSession, Teacher, CheatLog } from '../types';
import { isFirebaseEnabled } from '../lib/firebase';

interface StorageCapacityCardProps {
  exams: Exam[];
  studentSessions: StudentSession[];
  teachers: Teacher[];
  cheatLogs: CheatLog[];
  classes: string[];
}

export default function StorageCapacityCard({
  exams,
  studentSessions,
  teachers,
  cheatLogs,
  classes
}: StorageCapacityCardProps) {
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Calculate payload sizes in bytes
  const storageDetails = useMemo(() => {
    const examsBytes = new Blob([JSON.stringify(exams)]).size;
    const sessionsBytes = new Blob([JSON.stringify(studentSessions)]).size;
    const teachersBytes = new Blob([JSON.stringify(teachers)]).size;
    const cheatLogsBytes = new Blob([JSON.stringify(cheatLogs)]).size;
    const classesBytes = new Blob([JSON.stringify(classes)]).size;

    // Total raw JSON bytes
    const totalUsedBytes = examsBytes + sessionsBytes + teachersBytes + cheatLogsBytes + classesBytes;

    // LocalStorage overhead overhead (~2x char length in UTF-16)
    const localStorageUsedBytes = JSON.stringify(localStorage).length * 2;

    // Cloud limits: 1 GiB = 1,073,741,824 bytes (Free Tier Firestore)
    // LocalStorage limit: 5 MiB = 5,242,880 bytes
    const totalCapacityBytes = isFirebaseEnabled ? 1073741824 : 5242880; 

    const usedPercentage = Math.min(100, Math.max(0.01, (totalUsedBytes / totalCapacityBytes) * 100));
    const remainingBytes = Math.max(0, totalCapacityBytes - totalUsedBytes);

    // Estimates
    const avgExamSize = exams.length > 0 ? examsBytes / exams.length : 15000; // ~15 KB default
    const avgSessionSize = studentSessions.length > 0 ? sessionsBytes / studentSessions.length : 3000; // ~3 KB default

    const remainingExamsEstimate = Math.floor(remainingBytes / Math.max(1000, avgExamSize));
    const remainingSessionsEstimate = Math.floor(remainingBytes / Math.max(500, avgSessionSize));

    return {
      examsBytes,
      sessionsBytes,
      teachersBytes,
      cheatLogsBytes,
      classesBytes,
      totalUsedBytes,
      localStorageUsedBytes,
      totalCapacityBytes,
      usedPercentage,
      remainingBytes,
      remainingExamsEstimate,
      remainingSessionsEstimate,
      avgExamSize,
      avgSessionSize
    };
  }, [exams, studentSessions, teachers, cheatLogs, classes, lastRefreshed]);

  // Format helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleRefresh = () => {
    setLastRefreshed(new Date());
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6" id="admin-capacity-monitor">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 border border-blue-100">
            <HardDrive size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 font-sans">
                Monitoring & Kontrol Kapasitas Penyimpanan
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${
                isFirebaseEnabled 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isFirebaseEnabled ? <Database size={12} /> : <Server size={12} />}
                {isFirebaseEnabled ? 'Firebase Firestore Cloud' : 'Browser LocalStorage'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau estimasi penggunaan ruang penyimpanan data soal, lembar jawaban siswa, dan log sistem.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
          title="Segarkan kalkulasi memori"
        >
          <RefreshCw size={13} className="text-slate-500" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Primary Capacity Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Usage Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Kapasitas Terpakai</span>
              <Cpu size={14} className="text-blue-500" />
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {formatBytes(storageDetails.totalUsedBytes)}
              </span>
              <span className="text-xs font-bold text-slate-500">
                / {isFirebaseEnabled ? '1,024 MB (1 GB)' : '5.00 MB'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">
            Terisi <span className="font-bold text-slate-800">{storageDetails.usedPercentage < 0.01 ? '< 0.01%' : `${storageDetails.usedPercentage.toFixed(2)}%`}</span> dari total kuota.
          </p>
        </div>

        {/* Remaining Capacity Card */}
        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>Sisa Kapasitas Tersedia</span>
              <CheckCircle2 size={14} className="text-emerald-600" />
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-950">
                {formatBytes(storageDetails.remainingBytes)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-800 font-medium mt-2">
            Masih tersisa <span className="font-bold text-emerald-950">{(100 - storageDetails.usedPercentage).toFixed(2)}%</span> ruang kosong.
          </p>
        </div>

        {/* Cloud Mode Status Card */}
        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center justify-between">
              <span>Status Infrastruktur Data</span>
              <Database size={14} className="text-indigo-600" />
            </p>
            <p className="text-sm font-bold text-indigo-950 mt-1 flex items-center gap-1.5">
              {isFirebaseEnabled ? 'Terhubung ke Firestore' : 'Mode Offline LocalStorage'}
            </p>
          </div>
          <p className="text-[10px] text-indigo-800 font-medium mt-2">
            {isFirebaseEnabled 
              ? 'Tersinkronisasi otomatis ke cloud server Firebase.' 
              : 'Tersimpan lokal di browser komputer guru.'}
          </p>
        </div>

      </div>

      {/* Capacity Visual Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700 flex items-center gap-1.5">
            <Layers size={14} className="text-blue-600" />
            Penggunaan Ruang Penyimpanan:
          </span>
          <span className="font-mono text-slate-800">
            {formatBytes(storageDetails.totalUsedBytes)} dari {formatBytes(storageDetails.totalCapacityBytes)} ({storageDetails.usedPercentage < 0.01 ? '<0.01%' : `${storageDetails.usedPercentage.toFixed(2)}%`})
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 flex">
          {/* Exam segment */}
          <div 
            className="h-full bg-blue-500 rounded-l-full transition-all" 
            style={{ width: `${Math.max(0.5, (storageDetails.examsBytes / storageDetails.totalCapacityBytes) * 100)}%` }}
            title={`Soal: ${formatBytes(storageDetails.examsBytes)}`}
          />
          {/* Session segment */}
          <div 
            className="h-full bg-emerald-500 transition-all" 
            style={{ width: `${Math.max(0.5, (storageDetails.sessionsBytes / storageDetails.totalCapacityBytes) * 100)}%` }}
            title={`Sesi Siswa: ${formatBytes(storageDetails.sessionsBytes)}`}
          />
          {/* Cheat log segment */}
          <div 
            className="h-full bg-rose-500 transition-all" 
            style={{ width: `${Math.max(0.2, (storageDetails.cheatLogsBytes / storageDetails.totalCapacityBytes) * 100)}%` }}
            title={`Log Kecurangan: ${formatBytes(storageDetails.cheatLogsBytes)}`}
          />
          {/* Teacher segment */}
          <div 
            className="h-full bg-amber-500 rounded-r-full transition-all" 
            style={{ width: `${Math.max(0.2, (storageDetails.teachersBytes / storageDetails.totalCapacityBytes) * 100)}%` }}
            title={`Pengguna Guru: ${formatBytes(storageDetails.teachersBytes)}`}
          />
        </div>

        {/* Progress Bar Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
            <span>Bank Soal: <strong className="font-mono text-slate-800">{formatBytes(storageDetails.examsBytes)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>Hasil Siswa: <strong className="font-mono text-slate-800">{formatBytes(storageDetails.sessionsBytes)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
            <span>Log Sistem: <strong className="font-mono text-slate-800">{formatBytes(storageDetails.cheatLogsBytes)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span>Data Pengguna: <strong className="font-mono text-slate-800">{formatBytes(storageDetails.teachersBytes)}</strong></span>
          </div>
        </div>
      </div>

      {/* Estimasi Sisa Daya Tampung (Projections) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-blue-600" />
          Proyeksi Estimasi Sisa Kapasitas CAT:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Estimasi Paket Soal Baru</p>
              <p className="text-base font-black text-blue-900 font-mono mt-0.5">
                ± {storageDetails.remainingExamsEstimate.toLocaleString('id-ID')} Paket Soal
              </p>
            </div>
            <FileText size={20} className="text-blue-500 shrink-0" />
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Estimasi Lembar Jawaban Siswa</p>
              <p className="text-base font-black text-emerald-900 font-mono mt-0.5">
                ± {storageDetails.remainingSessionsEstimate.toLocaleString('id-ID')} Siswa
              </p>
            </div>
            <Users size={20} className="text-emerald-500 shrink-0" />
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic">
          *Kalkulasi berdasarkan estimasi rata-rata ukuran 1 paket soal (~15 KB) dan 1 lembar jawaban siswa (~3 KB).
        </p>
      </div>

      {/* Information & Maintenance Tips */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-bold">Tips Optimalisasi & Pengontrolan Kapasitas:</p>
          <ul className="list-disc list-inside text-blue-800/90 space-y-0.5 leading-relaxed">
            <li>Ekspor rekapitulasi nilai siswa ke format **Excel / CSV** sebelum menghapus ujian yang sudah berlalu.</li>
            <li>Gunakan tombol **"Bersihkan & Segarkan Memori"** secara berkala untuk mengosongkan cache browser.</li>
            {isFirebaseEnabled && (
              <li>
                Infrastruktur terhubung ke **Firebase Firestore Cloud** dengan kuota gratis harian hingga <strong>1 GB</strong> penyimpanan dan <strong>50.000 pembacaan dokumen/hari</strong>.
              </li>
            )}
          </ul>
        </div>
      </div>

    </div>
  );
}
