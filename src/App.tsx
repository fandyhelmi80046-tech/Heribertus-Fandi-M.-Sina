/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, User, BookOpen, AlertCircle, Sparkles, CheckCircle, 
  Info, ShieldCheck, Lock, Activity, ArrowRight, Printer
} from 'lucide-react';
import { Exam, StudentSession, Teacher, CheatLog } from './types';
import { INITIAL_EXAMS, INITIAL_STUDENT_SESSIONS, INITIAL_TEACHERS, INITIAL_CHEAT_LOGS, SCHOOL_CLASSES } from './data';
import PortalGuru from './components/PortalGuru';
import PortalSiswa from './components/PortalSiswa';
import {
  isFirebaseEnabled,
  dbGetExams, dbSaveExams,
  dbGetStudentSessions, dbSaveStudentSessions,
  dbGetTeachers, dbSaveTeachers,
  dbGetCheatLogs, dbSaveCheatLogs,
  dbGetClasses, dbSaveClasses
} from './lib/firebase';

export default function App() {
  // Application Master States
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentSessions, setStudentSessions] = useState<StudentSession[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  // Current active view: 'home' | 'siswa' | 'guru'
  const [currentView, setCurrentView] = useState<'home' | 'siswa' | 'guru'>('home');

  // Load master data on mount
  useEffect(() => {
    async function loadData() {
      // 1. Classes
      let finalClasses = SCHOOL_CLASSES;
      const dbClasses = await dbGetClasses();
      if (dbClasses && dbClasses.length > 0) {
        finalClasses = dbClasses;
      } else {
        const savedClasses = localStorage.getItem('classes_data');
        if (savedClasses) {
          try { finalClasses = JSON.parse(savedClasses); } catch (e) {}
        }
        if (isFirebaseEnabled) {
          await dbSaveClasses(finalClasses);
        }
      }
      setClasses(finalClasses);
      localStorage.setItem('classes_data', JSON.stringify(finalClasses));

      // 2. Exams
      let finalExams = INITIAL_EXAMS;
      const savedExamsStr = localStorage.getItem('exams_data');
      const examsInitialized = localStorage.getItem('exams_initialized');

      const dbExams = await dbGetExams();
      if (dbExams !== null) {
        if (dbExams.length > 0 || examsInitialized === 'true' || savedExamsStr !== null) {
          finalExams = dbExams;
        } else {
          finalExams = INITIAL_EXAMS;
          if (isFirebaseEnabled) await dbSaveExams(finalExams);
        }
      } else if (savedExamsStr !== null) {
        try { finalExams = JSON.parse(savedExamsStr); } catch (e) { finalExams = INITIAL_EXAMS; }
      } else {
        finalExams = INITIAL_EXAMS;
        if (isFirebaseEnabled) await dbSaveExams(finalExams);
      }
      setExams(finalExams);
      localStorage.setItem('exams_data', JSON.stringify(finalExams));
      localStorage.setItem('exams_initialized', 'true');

      // 3. Student Sessions
      let finalSessions = INITIAL_STUDENT_SESSIONS;
      const dbSessions = await dbGetStudentSessions();
      if (dbSessions && dbSessions.length > 0) {
        finalSessions = dbSessions;
      } else {
        const savedSessions = localStorage.getItem('student_sessions');
        if (savedSessions) {
          try { finalSessions = JSON.parse(savedSessions); } catch (e) {}
        }
        if (isFirebaseEnabled) {
          await dbSaveStudentSessions(finalSessions);
        }
      }
      setStudentSessions(finalSessions);
      localStorage.setItem('student_sessions', JSON.stringify(finalSessions));

      // 4. Teachers
      let finalTeachers = INITIAL_TEACHERS;
      const dbTeachers = await dbGetTeachers();
      if (dbTeachers && dbTeachers.length > 0) {
        finalTeachers = dbTeachers;
      } else {
        const savedTeachers = localStorage.getItem('teachers_data');
        if (savedTeachers) {
          try { finalTeachers = JSON.parse(savedTeachers); } catch (e) {}
        }
        if (isFirebaseEnabled) {
          await dbSaveTeachers(finalTeachers);
        }
      }
      setTeachers(finalTeachers);
      localStorage.setItem('teachers_data', JSON.stringify(finalTeachers));

      // 5. Cheat Logs
      let finalCheatLogs = INITIAL_CHEAT_LOGS;
      const savedCheatLogsStr = localStorage.getItem('cheat_logs');
      const cheatLogsInitialized = localStorage.getItem('cheat_logs_initialized');

      const dbCheatLogs = await dbGetCheatLogs();
      if (dbCheatLogs !== null) {
        if (dbCheatLogs.length > 0 || cheatLogsInitialized === 'true' || savedCheatLogsStr !== null) {
          finalCheatLogs = dbCheatLogs;
        } else {
          finalCheatLogs = INITIAL_CHEAT_LOGS;
          if (isFirebaseEnabled) await dbSaveCheatLogs(finalCheatLogs);
        }
      } else if (savedCheatLogsStr !== null) {
        try { finalCheatLogs = JSON.parse(savedCheatLogsStr); } catch (e) { finalCheatLogs = INITIAL_CHEAT_LOGS; }
      } else {
        finalCheatLogs = INITIAL_CHEAT_LOGS;
        if (isFirebaseEnabled) await dbSaveCheatLogs(finalCheatLogs);
      }
      setCheatLogs(finalCheatLogs);
      localStorage.setItem('cheat_logs', JSON.stringify(finalCheatLogs));
      localStorage.setItem('cheat_logs_initialized', 'true');
    }

    loadData();
  }, []);

  // Sync back to localStorage & Firestore on any state modification
  const handleSetExams: React.Dispatch<React.SetStateAction<Exam[]>> = (value) => {
    setExams(prev => {
      const computed = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('exams_data', JSON.stringify(computed));
      dbSaveExams(computed);
      return computed;
    });
  };

  const handleSetStudentSessions: React.Dispatch<React.SetStateAction<StudentSession[]>> = (value) => {
    setStudentSessions(prev => {
      const computed = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('student_sessions', JSON.stringify(computed));
      dbSaveStudentSessions(computed);
      return computed;
    });
  };

  const handleSetTeachers: React.Dispatch<React.SetStateAction<Teacher[]>> = (value) => {
    setTeachers(prev => {
      const computed = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('teachers_data', JSON.stringify(computed));
      dbSaveTeachers(computed);
      return computed;
    });
  };

  const handleSetCheatLogs: React.Dispatch<React.SetStateAction<CheatLog[]>> = (value) => {
    setCheatLogs(prev => {
      const computed = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('cheat_logs', JSON.stringify(computed));
      dbSaveCheatLogs(computed);
      return computed;
    });
  };

  const handleSetClasses: React.Dispatch<React.SetStateAction<string[]>> = (value) => {
    setClasses(prev => {
      const computed = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('classes_data', JSON.stringify(computed));
      dbSaveClasses(computed);
      return computed;
    });
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${currentView === 'home' ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500 relative overflow-hidden' : 'bg-[#f8fafc]'} text-slate-800 selection:bg-fuchsia-500 selection:text-white flex flex-col justify-between`} id="app-root">
      
      {/* Decorative Blur Blobs for Home View */}
      {currentView === 'home' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-400/40 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-orange-400/30 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-400/40 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '5s' }} />
        </div>
      )}

      {/* Dynamic Views container with standard transitions */}
      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* VIEW A: LANDING PAGE */}
          {currentView === 'home' && (
            <motion.div
              key="home-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[90vh]"
            >
              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-white rounded-lg text-xs font-bold border border-white/30 mb-6 font-mono backdrop-blur-sm shadow-sm">
                <Sparkles size={12} className="text-yellow-300" />
                <span>VERSI SISTEM 2.4.0-PRO</span>
              </div>

              {/* Title Header */}
              <div className="text-center max-w-2xl mb-12">
                <div className="inline-block bg-white text-fuchsia-600 font-black text-3xl h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-fuchsia-900/20">
                  5
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold font-sans tracking-tight text-white leading-tight drop-shadow-sm">
                  CAT_SMPN5LR
                </h1>
                <p className="text-sm md:text-base text-white/90 mt-5 font-medium leading-relaxed bg-black/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg">
                  Sistem Evaluasi Ujian Akhir Sekolah Mandiri yang dirancang khusus untuk memfasilitasi integrasi portal guru dan siswa SMP Negeri 5 Langke Rembong secara akurat, transparan, dan aman.
                </p>
              </div>

              {/* Action Cards (Teacher vs Student) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-12">
                
                {/* Siswa Card */}
                <motion.button
                  id="nav-to-siswa-btn"
                  onClick={() => setCurrentView('siswa')}
                  whileHover={{ y: -4, shadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                  className="bg-white p-8 rounded-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-left cursor-pointer transition-all flex flex-col justify-between h-72 group"
                >
                  <div className="space-y-4">
                    <div className="h-11 w-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shadow-2xs">
                      <User size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Portal Siswa</h2>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                        Masuk sesuai rombel kelas Anda, kerjakan soal CAT dengan navigasi nomor, timer interaktif, dan status ragu-ragu.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mt-4 group-hover:underline">
                    <span>Mulai Ujian Sekarang</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>

                {/* Guru Card */}
                <motion.button
                  id="nav-to-guru-btn"
                  onClick={() => setCurrentView('guru')}
                  whileHover={{ y: -4, shadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                  className="bg-white p-8 rounded-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-left cursor-pointer transition-all flex flex-col justify-between h-72 group"
                >
                  <div className="space-y-4">
                    <div className="h-11 w-11 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 shadow-2xs">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Portal Guru & Pengawas</h2>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                        Mendaftarkan ujian baru, menyusun 5 jenis soal, menentukan KKM, koreksi essay manual, memantau kecurangan, dan cetak laporan hasil.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mt-4 group-hover:underline">
                    <span>Akses Portal Evaluasi</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>

              </div>



            </motion.div>
          )}

          {/* VIEW B: PORTAL GURU */}
          {currentView === 'guru' && (
            <motion.div
              key="guru-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PortalGuru
                exams={exams}
                setExams={handleSetExams}
                studentSessions={studentSessions}
                setStudentSessions={handleSetStudentSessions}
                teachers={teachers}
                setTeachers={handleSetTeachers}
                cheatLogs={cheatLogs}
                setCheatLogs={handleSetCheatLogs}
                classes={classes}
                setClasses={handleSetClasses}
                onLogout={() => setCurrentView('home')}
              />
            </motion.div>
          )}

          {/* VIEW C: PORTAL SISWA */}
          {currentView === 'siswa' && (
            <motion.div
              key="siswa-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PortalSiswa
                exams={exams}
                studentSessions={studentSessions}
                setStudentSessions={handleSetStudentSessions}
                cheatLogs={cheatLogs}
                setCheatLogs={handleSetCheatLogs}
                classes={classes}
                onBackToMain={() => setCurrentView('home')}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER BAR (HIDDEN DURING ACTIVE EXAM TO ENSURE NO CLUTTER) */}
      {currentView !== 'siswa' && (
        <footer className={`${currentView === 'home' ? 'bg-transparent text-white/80 border-t border-white/20' : 'bg-white border-t border-gray-200 text-gray-500'} py-6 text-center text-xs select-none print:hidden relative z-10`}>
          <p>© {new Date().getFullYear()} CAT_SMPN5LR • SMP Negeri 5 Langke Rembong. Hak Cipta Dilindungi Undang-Undang.</p>
          <p className={`${currentView === 'home' ? 'text-white/60' : 'text-gray-400'} text-[10px] mt-1`}>Dikembangkan untuk Sistem Penilaian Terstandarisasi & Profesional</p>
        </footer>
      )}

    </div>
  );
}
