/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, BookOpen, Clock, AlertTriangle, ChevronLeft, ChevronRight, 
  CheckCircle, LogIn, Award, HelpCircle, Lock, ShieldAlert, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Exam, Question, QuestionType, StudentSession, CheatLog } from '../types';

interface PortalSiswaProps {
  exams: Exam[];
  studentSessions: StudentSession[];
  setStudentSessions: React.Dispatch<React.SetStateAction<StudentSession[]>>;
  cheatLogs: CheatLog[];
  setCheatLogs: React.Dispatch<React.SetStateAction<CheatLog[]>>;
  classes: string[];
  onBackToMain: () => void;
}

export default function PortalSiswa({
  exams,
  studentSessions,
  setStudentSessions,
  cheatLogs,
  setCheatLogs,
  classes,
  onBackToMain
}: PortalSiswaProps) {
  // Login States
  const [studentName, setStudentName] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);
  const [activeSession, setActiveSession] = useState<StudentSession | null>(null);
  const [loginError, setLoginError] = useState<string>('');

  // active exam taking state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Warning Popup state (for cheating detection)
  const [showCheatWarning, setShowCheatWarning] = useState<boolean>(false);
  const [lastViolationType, setLastViolationType] = useState<string>('');

  // Submit confirmation modal state (replaces native confirm/alert)
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState<boolean>(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

  // Keep track of warning count in ref to prevent closure issues in event listeners
  const warningsRef = useRef<number>(0);
  const isExamActiveRef = useRef<boolean>(false);
  const activeSessionIdRef = useRef<string | null>(null);

  // Time remaining formatted
  const [timeString, setTimeString] = useState<string>('00:00');

  // Load active session from localStorage if exists
  useEffect(() => {
    const savedSession = localStorage.getItem('active_student_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Verify session is not submitted yet
        const dbSession = studentSessions.find(s => s.id === parsed.id);
        if (dbSession && !dbSession.isSubmitted) {
          setActiveSession(dbSession);
          warningsRef.current = dbSession.cheatWarningsCount;
          activeSessionIdRef.current = dbSession.id;
          
          const matchingExam = exams.find(e => e.id === dbSession.examId);
          if (matchingExam) {
            setActiveExam(matchingExam);
            isExamActiveRef.current = true;
          }
        } else {
          localStorage.removeItem('active_student_session');
        }
      } catch (e) {
        localStorage.removeItem('active_student_session');
      }
    }
  }, [exams, studentSessions]);

  // Sync session ref
  useEffect(() => {
    if (activeSession) {
      activeSessionIdRef.current = activeSession.id;
      warningsRef.current = activeSession.cheatWarningsCount;
      isExamActiveRef.current = !activeSession.isSubmitted;
    } else {
      activeSessionIdRef.current = null;
      isExamActiveRef.current = false;
    }
  }, [activeSession]);

  // Handle student login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedName = studentName.trim();
    if (!trimmedName) {
      setLoginError('Nama Lengkap tidak boleh kosong');
      return;
    }

    // Login success, redirect to student dashboard with profile identity
    const profileId = `profile-${selectedClass.toLowerCase()}-${trimmedName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Check if there is an unsubmitted active exam session in progress to resume directly
    const inProgressSession = studentSessions.find(s => 
      s.studentName.toLowerCase() === trimmedName.toLowerCase() && 
      s.className === selectedClass && 
      !s.isSubmitted && 
      s.examId
    );

    if (inProgressSession) {
      setActiveSession(inProgressSession);
      localStorage.setItem('active_student_session', JSON.stringify(inProgressSession));
      const matchingExam = exams.find(e => e.id === inProgressSession.examId);
      if (matchingExam) {
        setActiveExam(matchingExam);
      }
    } else {
      const studentProfileSession: StudentSession = {
        id: profileId,
        studentName: trimmedName,
        className: selectedClass,
        examId: '',
        subject: '',
        startTime: '',
        timeLeftSeconds: 0,
        isSubmitted: false,
        isCheated: false,
        cheatWarningsCount: 0,
        answers: {},
        doubtFlags: {},
        essayScores: {},
        autoScore: 0,
        finalScore: 0,
        isGraded: false
      };
      setActiveSession(studentProfileSession);
      localStorage.setItem('active_student_session', JSON.stringify(studentProfileSession));
    }
  };

  // Start exam session
  const handleStartExam = (exam: Exam) => {
    if (!activeSession) return;

    // Guard: Verify if this exam has already been submitted by this student
    const existingSubmitted = studentSessions.find(s => 
      s.studentName.toLowerCase() === activeSession.studentName.toLowerCase() && 
      s.className === activeSession.className && 
      (s.examId === exam.id || s.subject === exam.subject) && 
      s.isSubmitted
    );

    if (existingSubmitted) {
      alert(`Ujian Mata Pelajaran "${exam.title || exam.subject}" telah selesai Anda kerjakan dan dikumpulkan.\n\nAnda tidak dapat mengerjakan ulang kecuali jika di-reset oleh Guru Pengawas.`);
      return;
    }

    const sessionId = `sess-${activeSession.className.toLowerCase()}-${activeSession.studentName.toLowerCase().replace(/\s+/g, '-')}-${exam.id}`;
    const existingSession = studentSessions.find(s => s.id === sessionId);

    let sessionToUse: StudentSession;
    if (existingSession && !existingSession.isSubmitted) {
      sessionToUse = existingSession;
    } else {
      const nowStr = new Date().toISOString();
      const durationSeconds = exam.durationMinutes * 60;
      sessionToUse = {
        id: sessionId,
        studentName: activeSession.studentName,
        className: activeSession.className,
        examId: exam.id,
        subject: exam.subject,
        startTime: nowStr,
        timeLeftSeconds: durationSeconds,
        isSubmitted: false,
        answers: {},
        doubtFlags: {},
        essayScores: {},
        autoScore: 0,
        finalScore: 0,
        isGraded: false,
        cheatWarningsCount: 0,
        isCheated: false
      };
    }

    // Save in master list
    const updatedSessions = [...studentSessions.filter(s => s.id !== sessionId), sessionToUse];
    setStudentSessions(updatedSessions);
    localStorage.setItem('student_sessions', JSON.stringify(updatedSessions));

    // Set active states
    setActiveSession(sessionToUse);
    setActiveExam(exam);
    setCurrentQuestionIndex(0);
    warningsRef.current = sessionToUse.cheatWarningsCount;
    isExamActiveRef.current = true;
    localStorage.setItem('active_student_session', JSON.stringify(sessionToUse));
  };

  // Timer countdown handler
  useEffect(() => {
    if (!activeExam || !activeSession || activeSession.isSubmitted) return;

    const interval = setInterval(() => {
      setActiveSession(prevSession => {
        if (!prevSession || prevSession.isSubmitted) {
          clearInterval(interval);
          return prevSession;
        }

        const nextSeconds = prevSession.timeLeftSeconds - 1;

        if (nextSeconds <= 0) {
          clearInterval(interval);
          setTimeout(() => {
            handleForceSubmit(prevSession.id, false, 'Waktu pengerjaan habis secara otomatis!');
          }, 0);
          return prevSession;
        }

        const mins = Math.floor(nextSeconds / 60);
        const secs = nextSeconds % 60;
        setTimeString(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);

        const updatedSession = { ...prevSession, timeLeftSeconds: nextSeconds };
        localStorage.setItem('active_student_session', JSON.stringify(updatedSession));

        // Sync master list asynchronously
        setTimeout(() => {
          setStudentSessions(prevList => {
            const newList = prevList.map(s => s.id === updatedSession.id ? updatedSession : s);
            localStorage.setItem('student_sessions', JSON.stringify(newList));
            return newList;
          });
        }, 0);

        return updatedSession;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeExam?.id, activeSession?.id, activeSession?.isSubmitted]);

  // Anti-Cheating tab-switch tracker
  useEffect(() => {
    const handleFocusLoss = (type: string) => {
      // ONLY trigger if exam is active, no warning is already shown, and not already submitted
      if (!isExamActiveRef.current || !activeSessionIdRef.current) return;

      const currentSessId = activeSessionIdRef.current;
      const nextWarnings = warningsRef.current + 1;
      warningsRef.current = nextWarnings;

      // Add cheat log entry
      const nowStr = new Date().toISOString();
      const currentSess = studentSessions.find(s => s.id === currentSessId);
      const subjectName = currentSess?.subject || 'Ujian Sekolah';
      const studentNameVal = currentSess?.studentName || 'Siswa';
      const classNameVal = currentSess?.className || '-';

      const newLog: CheatLog = {
        id: `cl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentName: studentNameVal,
        className: classNameVal,
        subject: subjectName,
        timestamp: nowStr,
        message: `Meninggalkan layar ujian (${type}) - Peringatan ke-${nextWarnings}`
      };

      // Set state and save
      const nextLogs = [...cheatLogs, newLog];
      setCheatLogs(nextLogs);
      localStorage.setItem('cheat_logs', JSON.stringify(nextLogs));

      const hasExceeded = nextWarnings > 3;

      setStudentSessions(prev => {
        const nextSessions = prev.map(s => {
          if (s.id === currentSessId) {
            return {
              ...s,
              cheatWarningsCount: nextWarnings,
              isCheated: hasExceeded ? true : s.isCheated
            };
          }
          return s;
        });
        localStorage.setItem('student_sessions', JSON.stringify(nextSessions));
        return nextSessions;
      });

      if (activeSession && activeSession.id === currentSessId) {
        const updated = {
          ...activeSession,
          cheatWarningsCount: nextWarnings,
          isCheated: hasExceeded ? true : activeSession.isCheated
        };
        setActiveSession(updated);
        localStorage.setItem('active_student_session', JSON.stringify(updated));
      }

      if (hasExceeded) {
        setTimeout(() => {
          handleForceSubmit(currentSessId, true, 'Sistem Mengunci Ujian Secara Otomatis karena batas kecurangan terlampaui!');
        }, 10);
      } else {
        setLastViolationType(type);
        setShowCheatWarning(true);
      }
    };

    // visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFocusLoss('Pindah Tab Browser');
      }
    };

    // window blur listener
    const handleWindowBlur = () => {
      handleFocusLoss('Keluar Fokus Layar / Minimalkan Jendela');
    };

    // Register listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [studentSessions, cheatLogs]);

  // Handle force submission (due to time limit or cheating lock)
  const handleForceSubmit = (sessId: string, dueToCheating: boolean, reasonText: string) => {
    isExamActiveRef.current = false;
    setShowCheatWarning(false);

    const dbSession = studentSessions.find(s => s.id === sessId);
    if (!dbSession || dbSession.isSubmitted) return;

    const exam = exams.find(e => e.id === dbSession.examId);
    if (!exam) return;

    // Calculate final score
    let totalWeight = 0;
    let earnedPoints = 0;

    exam.questions.forEach(q => {
      totalWeight += q.weight;
      const ans = dbSession.answers[q.id];

      if (q.type === QuestionType.PILIHAN_GANDA) {
        if (ans === q.correctAnswerIndex) earnedPoints += q.weight;
      } 
      else if (q.type === QuestionType.PILIHAN_GANDA_KOMPLEKS) {
        if (Array.isArray(ans) && Array.isArray(q.correctAnswerIndices)) {
          const matchesAll = 
            ans.length === q.correctAnswerIndices.length &&
            ans.every(v => q.correctAnswerIndices!.includes(v));
          if (matchesAll) earnedPoints += q.weight;
        }
      } 
      else if (q.type === QuestionType.BENAR_SALAH) {
        if (ans === q.correctTrueFalse) earnedPoints += q.weight;
      } 
      else if (q.type === QuestionType.MENJODOHKAN) {
        if (ans && q.matchingPairs) {
          let correctPairsCount = 0;
          q.matchingPairs.forEach(p => {
            if (ans[p.id] === p.response) correctPairsCount++;
          });
          const share = correctPairsCount / q.matchingPairs.length;
          earnedPoints += share * q.weight;
        }
      }
    });

    const autoGrade = Math.round((earnedPoints / (totalWeight || 1)) * 100);
    const finalScore = dueToCheating ? 0 : autoGrade;
    const hasEssays = exam.questions.some(q => q.type === QuestionType.ESSAY);

    const nextSession: StudentSession = {
      ...dbSession,
      isSubmitted: true,
      endTime: new Date().toISOString(),
      isCheated: dueToCheating || dbSession.isCheated,
      autoScore: autoGrade,
      finalScore: finalScore,
      isGraded: dueToCheating ? true : !hasEssays
    };

    if (dueToCheating) {
      const lockoutLog: CheatLog = {
        id: `cl-${Date.now()}-lock`,
        studentName: dbSession.studentName,
        className: dbSession.className,
        subject: dbSession.subject,
        timestamp: new Date().toISOString(),
        message: reasonText
      };
      const nextLogs = [...cheatLogs, lockoutLog];
      setCheatLogs(nextLogs);
      localStorage.setItem('cheat_logs', JSON.stringify(nextLogs));
    }

    setActiveSession(nextSession);
    localStorage.setItem('active_student_session', JSON.stringify(nextSession));

    setStudentSessions(prev => {
      const updated = prev.map(s => s.id === sessId ? nextSession : s);
      localStorage.setItem('student_sessions', JSON.stringify(updated));
      return updated;
    });

    setSubmitSuccessMessage(reasonText);
  };

  // Student manually clicks submit button
  const handleManualSubmit = () => {
    if (!activeSession || !activeExam) return;
    setIsConfirmingSubmit(true);
  };

  const handleConfirmFinalSubmit = () => {
    setIsConfirmingSubmit(false);
    if (!activeSession) return;
    handleForceSubmit(activeSession.id, false, 'Jawaban ujian Anda telah berhasil dikirim ke server!');
  };

  // Direct answer saving
  const handleSaveAnswer = (questionId: string, answerVal: any) => {
    if (!activeSession) return;

    const updatedAnswers = {
      ...activeSession.answers,
      [questionId]: answerVal
    };

    const updatedSession: StudentSession = {
      ...activeSession,
      answers: updatedAnswers
    };

    // Save in State and Master List
    setActiveSession(updatedSession);
    localStorage.setItem('active_student_session', JSON.stringify(updatedSession));

    setStudentSessions(prev => {
      const next = prev.map(s => s.id === activeSession.id ? updatedSession : s);
      localStorage.setItem('student_sessions', JSON.stringify(next));
      return next;
    });
  };

  // Toggle "Ragu-ragu"
  const handleToggleDoubt = (questionId: string) => {
    if (!activeSession) return;

    const updatedDoubt = {
      ...activeSession.doubtFlags,
      [questionId]: !activeSession.doubtFlags[questionId]
    };

    const updatedSession = {
      ...activeSession,
      doubtFlags: updatedDoubt
    };

    setActiveSession(updatedSession);
    localStorage.setItem('active_student_session', JSON.stringify(updatedSession));

    setStudentSessions(prev => {
      const next = prev.map(s => s.id === activeSession.id ? updatedSession : s);
      localStorage.setItem('student_sessions', JSON.stringify(next));
      return next;
    });
  };

  // Render question list active for student class
  const activeExamsForClass = exams.filter(e => e.className === selectedClass && e.isActive);

  // If student is logged in, show active portal
  const isLoggedIn = activeSession !== null;

  // Let's check if they have submitted the current exam
  const hasFinishedActiveExam = activeSession && activeSession.isSubmitted;

  return (
    <div className={`min-h-screen ${isLoggedIn ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-fuchsia-50/80' : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500'} flex flex-col font-sans relative overflow-hidden`} id="student-portal-root">
      
      {/* Decorative Blur Blobs */}
      {!isLoggedIn && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-400/40 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-orange-400/30 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-400/40 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '5s' }} />
        </div>
      )}
      {isLoggedIn && (
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none z-0" />
      )}

      {/* HEADER SECTION (HIDDEN IN ACTIVE TEST TO MAXIMIZE FOCUS AREA) */}
      {!activeExam && (
        <header className={`${isLoggedIn ? 'bg-white/70 backdrop-blur-xl text-slate-800 border-b border-fuchsia-200/50 shadow-sm sticky top-0 z-40' : 'bg-transparent text-white border-b border-white/20 relative z-10'} print:hidden`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 ${isLoggedIn ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/20' : 'bg-white text-fuchsia-600 shadow-xl shadow-fuchsia-900/20'} rounded-xl flex items-center justify-center font-bold text-base`}>
                5
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isLoggedIn ? 'text-slate-400' : 'text-white/80'} font-semibold uppercase tracking-wider`}>Portal Siswa</span>
                  <span className={`text-xs ${isLoggedIn ? 'text-slate-300' : 'text-white/30'}`}>/</span>
                  <span className={`text-xs font-bold ${isLoggedIn ? 'text-fuchsia-600' : 'text-white'} uppercase tracking-wider`}>Ruang Ujian</span>
                </div>
                <h1 className={`text-base font-extrabold tracking-tight ${isLoggedIn ? 'text-slate-900' : 'text-white drop-shadow-sm'} font-sans`}>
                  CAT_SMPN5LR
                </h1>
              </div>
            </div>
            
            {isLoggedIn && (
              <button
                id="student-logout"
                onClick={() => {
                  setActiveSession(null);
                  localStorage.removeItem('active_student_session');
                }}
                className="px-3 py-1.5 bg-white/50 hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <span>Ganti Akun</span>
              </button>
            )}

            {!isLoggedIn && (
              <button
                onClick={onBackToMain}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 backdrop-blur-sm shadow-sm"
              >
                <span>Kembali ke Beranda</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* RENDER VIEW 1: STUDENT LOGIN FORM */}
      {!isLoggedIn && (
        <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10" id="student-login-view">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="max-w-md w-full bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl shadow-indigo-900/20 border border-white"
          >
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-indigo-100">
                <User size={36} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">Ujian Masuk Siswa</h2>
              <p className="mt-1 text-sm text-slate-500">Pilih kelas dan isi nama lengkap sesuai dokumen absensi.</p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleLogin}>
              {loginError && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Pilih Kelas Anda
                </label>
                <select
                  id="student-class-select"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:bg-white transition-all"
                >
                  {classes.map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="student-name-input"
                  type="text"
                  required
                  placeholder="Ketik Nama Lengkap Anda..."
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <button
                id="student-login-submit"
                type="submit"
                className="w-full py-3.5 bg-gradient-to-br from-indigo-600 hover:from-indigo-700 to-fuchsia-600 hover:to-fuchsia-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn size={18} />
                <span>Masuk Portal Ujian</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* RENDER VIEW 2: STUDENT DASHBOARD (EXAM LISTS) */}
      {isLoggedIn && !activeExam && (
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 relative z-10" id="student-dashboard-view">
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-white shadow-xl shadow-indigo-900/5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-indigo-700 border border-fuchsia-200 rounded-full flex items-center justify-center font-bold text-xl shadow-inner">
                {activeSession.studentName.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Selamat Datang, {activeSession.studentName}!</h2>
                <p className="text-xs text-slate-500 font-medium">Anggota Kelas Terdaftar: <span className="font-bold text-fuchsia-600">Kelas {activeSession.className}</span></p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-fuchsia-50 border border-indigo-100 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 shadow-sm">
              Ujian Tersedia Hari Ini
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
              <BookOpen size={18} />
            </div>
            <span>Mata Pelajaran Aktif yang Harus Diikuti</span>
          </h3>

          {activeExamsForClass.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 text-slate-400 shadow-lg shadow-slate-200/50">
              <Award size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="font-bold text-slate-700">Tidak Ada Ujian Aktif</p>
              <p className="text-xs mt-1 text-slate-500">Saat ini belum ada jadwal ujian aktif untuk Kelas {activeSession.className}. Silakan hubungi guru pengawas Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeExamsForClass.map(exam => {
                // Check if this exam is already taken by the student
                const sessionRecord = studentSessions.find(s => s.studentName.toLowerCase() === activeSession.studentName.toLowerCase() && s.className === activeSession.className && s.examId === exam.id);
                const isDone = sessionRecord?.isSubmitted;
                const isLocked = sessionRecord?.isCheated;

                return (
                  <div key={exam.id} className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-lg shadow-indigo-100/40 flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                    <div>
                      <div className="flex justify-between items-start flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold uppercase tracking-wider">
                            Kelas {exam.className}
                          </span>
                          {exam.assessmentType && (
                            <span className="px-2 py-0.5 rounded-md bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 text-[10px] font-extrabold uppercase tracking-wider">
                              {exam.assessmentType}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-bold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Clock size={12} />
                          {exam.durationMinutes} Menit
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mt-3 leading-tight">
                        {exam.title ? `${exam.title} (${exam.subject})` : exam.subject}
                      </h4>
                      
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p>Kriteria KKM: <span className="font-black text-slate-900">{exam.kkm}</span></p>
                        <p>Total Soal: <span className="font-black text-slate-900">{exam.questions.length} Soal</span></p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      {isLocked ? (
                        <div className="w-full text-center py-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5">
                          <Lock size={14} />
                          <span>DIKUNCI (KECURANGAN)</span>
                        </div>
                      ) : isDone ? (
                        <div className="w-full text-center py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5">
                          <CheckCircle size={14} />
                          <span>UJIAN SELESAI</span>
                        </div>
                      ) : (
                        <button
                          id={`start-exam-${exam.id}`}
                          onClick={() => handleStartExam(exam)}
                          className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-900/20"
                        >
                          Mulai Ujian Sekarang
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW 3: ACTIVE TEST ROOM (THE CAT SYSTEM) */}
      {activeExam && activeSession && (
        <div className="flex-1 flex flex-col-reverse lg:flex-row h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white relative z-50" id="cat-test-room-root">
          
          {/* Subtle colored glow in the dark mode */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-900/20 blur-[100px] rounded-full pointer-events-none z-0" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-900/20 blur-[100px] rounded-full pointer-events-none z-0" />
          
          {/* CHEAT WARNING POPUP OVERLAY */}
          {showCheatWarning && (
            <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[9999]">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-rose-950/90 backdrop-blur-md border border-rose-500/50 rounded-2xl p-8 text-center text-rose-100 space-y-6 shadow-2xl shadow-rose-900/50"
              >
                <div className="mx-auto h-20 w-20 bg-rose-900/50 text-rose-400 rounded-full flex items-center justify-center animate-bounce shadow-inner border border-rose-500/30">
                  <ShieldAlert size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-wide text-rose-400">PERINGATAN KERAS!</h3>
                  <p className="text-xs text-rose-300 font-bold font-mono bg-rose-950 p-2 rounded-lg border border-rose-800">
                    Pelanggaran: {activeSession.cheatWarningsCount} dari 3 kali batas maksimal.
                  </p>
                  <p className="text-sm text-rose-200 mt-2 font-medium">
                    Sistem mendeteksi Anda berusaha keluar dari layar ujian ({lastViolationType}).
                  </p>
                </div>
                <div className="p-4 bg-black/40 text-xs rounded-xl border border-rose-900/50 leading-relaxed italic text-rose-300">
                  Jangan mencoba berpindah tab browser, membuka chat, meminimalkan aplikasi, atau membuka tab lain. Pelanggaran berikutnya akan otomatis <span className="font-bold underline text-rose-100">mengunci paksa lembar ujian</span> dan memberikan nilai 0.
                </div>
                <button
                  id="acknowledge-cheat"
                  onClick={() => setShowCheatWarning(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black rounded-xl text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-rose-900/20 transition-all"
                >
                  Saya Mengerti & Kembali ke Ujian
                </button>
              </motion.div>
            </div>
          )}

          {/* If the session is already submitted or cheated, block with locked page */}
          {activeSession.isSubmitted ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/90 backdrop-blur-sm text-center relative z-10">
              <div className="max-w-md space-y-6">
                <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-4 shadow-2xl ${
                  activeSession.isCheated ? 'bg-rose-950 text-rose-500 border border-rose-500/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {activeSession.isCheated ? <Lock size={40} /> : <CheckCircle size={40} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    {activeSession.isCheated ? 'Ujian Dikunci Permanen' : 'Ujian Telah Selesai'}
                  </h3>
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                    {activeSession.isCheated 
                      ? 'Lembar jawaban Anda telah dibekukan karena melanggar batas tata tertib (keluar tab/jendela browser sebanyak lebih dari 3 kali). Log kejadian telah dikirim ke Guru Pengawas.'
                      : 'Terima kasih, pengerjaan Anda telah terekam di sistem bank data sekolah. Guru pengawas akan memeriksa jawaban essay Anda secara manual.'}
                  </p>
                </div>
                <button
                  id="back-from-lock"
                  onClick={() => {
                    setActiveExam(null);
                    localStorage.removeItem('active_student_session');
                  }}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl cursor-pointer border border-white/10 transition-all uppercase tracking-wider"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* THE ACTIVE TEST CONTAINER */}
              {(() => {
                const q = activeExam.questions[currentQuestionIndex];
                if (!q) return null;

                const studentAns = activeSession.answers[q.id];

                return (
                  <>
                    {/* LEFT SIDEBAR: QUESTION NAV NAVIGATOR GRID */}
                    <aside className="w-full lg:w-72 max-h-52 lg:max-h-none bg-slate-950/40 backdrop-blur-md p-4 lg:p-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-r border-white/5 flex-shrink-0 select-none overflow-y-auto relative z-10">
                      <div>
                        {/* Student mini info (hidden on mobile for space) */}
                        <div className="hidden lg:block p-4 bg-white/5 rounded-xl border border-white/10 mb-6 shadow-inner">
                          <p className="text-[10px] text-fuchsia-400 uppercase tracking-widest leading-none font-black">PESERTA UJIAN</p>
                          <p className="font-bold text-sm text-slate-100 truncate mt-1.5">{activeSession.studentName}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">Kelas: {activeSession.className}</p>
                        </div>

                        <div className="flex justify-between items-center lg:block mb-3 lg:mb-3">
                          <p className="text-[10px] lg:text-xs font-semibold text-indigo-300 uppercase tracking-widest">NAVIGASI SOAL</p>
                          <p className="lg:hidden text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-white">Soal {currentQuestionIndex + 1} / {activeExam.questions.length}</p>
                        </div>
                        
                        {/* Grid */}
                        <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5 lg:gap-2">
                          {activeExam.questions.map((qst, idx) => {
                            const ans = activeSession.answers[qst.id];
                            const isAnswered = ans !== undefined && ans !== null && (typeof ans !== 'string' || ans.trim() !== '') && (!Array.isArray(ans) || ans.length > 0);
                            const isDoubt = activeSession.doubtFlags[qst.id];
                            const isActive = currentQuestionIndex === idx;

                            let btnClass = 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10';
                            if (isActive) {
                              btnClass = 'bg-fuchsia-600 text-white ring-2 ring-fuchsia-400/50 border-transparent shadow-lg shadow-fuchsia-900/50';
                            } else if (isDoubt) {
                              btnClass = 'bg-amber-500 text-slate-950 border-transparent font-bold shadow-md shadow-amber-900/20';
                            } else if (isAnswered) {
                              btnClass = 'bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-900/20';
                            }

                            return (
                              <button
                                key={qst.id}
                                id={`nav-q-${idx}`}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`h-10 rounded-lg border flex items-center justify-center text-xs font-bold font-mono transition-all cursor-pointer ${btnClass}`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Warnings counter indicator */}
                      <div className="mt-8 pt-4 border-t border-slate-800 text-xs space-y-2">
                        {activeSession.cheatWarningsCount > 0 && (
                          <div className="p-2.5 bg-red-950/40 border border-red-900/60 rounded text-red-400 flex items-center gap-1.5 font-medium">
                            <AlertTriangle size={14} className="flex-shrink-0 text-red-500" />
                            <span>Pelanggaran Terdeteksi: {activeSession.cheatWarningsCount} / 3</span>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                          *Warna kotak nomor: Abu = Kosong, Hijau = Terjawab, Kuning = Ragu-ragu, Biru = Aktif.
                        </p>
                      </div>
                    </aside>

                    {/* MAIN EXAM CONTENT PANEL */}
                    <main className="flex-1 flex flex-col justify-between overflow-hidden">
                      
                      {/* Top Exam Header details */}
                      <div className="px-4 lg:px-6 py-3 lg:py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 lg:gap-4 flex-shrink-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] lg:text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">
                            {activeExam.assessmentType ? `${activeExam.assessmentType} • ${activeExam.subject}` : activeExam.subject}
                          </p>
                          <h2 className="text-xs lg:text-sm font-bold text-slate-100 mt-0.5 truncate">
                            {activeExam.title || 'Mata Uji Sekolah Aktif'}
                          </h2>
                        </div>
                        
                        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
                          {/* Timer display */}
                          <div className="flex items-center gap-1.5 lg:gap-2 bg-slate-900 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg border border-slate-800">
                            <Clock size={14} className="text-blue-500 lg:w-4 lg:h-4 w-3.5 h-3.5" />
                            <span className="font-mono font-bold text-xs lg:text-sm tracking-widest text-slate-100" id="cat-countdown-timer">
                              {timeString}
                            </span>
                          </div>

                          <button
                            id="submit-exam-btn"
                            onClick={handleManualSubmit}
                            className="px-3 lg:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] lg:text-xs font-extrabold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <CheckCircle size={14} className="hidden sm:block" />
                            <span>SELESAI</span>
                          </button>
                        </div>
                      </div>

                      {/* Central question workarea */}
                      <div className="flex-1 overflow-y-auto p-8 bg-slate-900 max-w-4xl w-full mx-auto space-y-6">
                        
                        {/* Question label bar */}
                        <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
                          <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 font-bold font-mono text-[11px] rounded tracking-wide border border-blue-800/60">
                            SOAL NOMOR {currentQuestionIndex + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded">
                            {q.type.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Question text */}
                        <div className="p-1">
                          <h3 className="text-base sm:text-lg font-medium text-slate-100 whitespace-pre-line leading-relaxed">
                            {q.questionText}
                          </h3>
                        </div>

                        {/* RENDER SPECIFIC INPUTS */}
                        <div className="mt-8 border-t border-slate-800/60 pt-6">
                          
                          {/* 1. PILIHAN GANDA */}
                          {q.type === QuestionType.PILIHAN_GANDA && q.options && (
                            <div className="space-y-3" id={`q-input-pilihan-ganda-${q.id}`}>
                              {q.options.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  id={`opt-btn-${oIdx}`}
                                  onClick={() => handleSaveAnswer(q.id, oIdx)}
                                  className={`w-full p-4 rounded-xl text-left border flex items-center gap-4 transition-all text-sm cursor-pointer ${
                                    studentAns === oIdx
                                      ? 'bg-blue-950/50 border-blue-500 text-blue-100 ring-1 ring-blue-900'
                                      : 'bg-slate-950/30 border-slate-800 text-slate-300 hover:bg-slate-900/50'
                                  }`}
                                >
                                  <div className={`h-6 w-6 rounded-full border flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                    studentAns === oIdx
                                      ? 'bg-blue-600 text-white border-transparent'
                                      : 'border-slate-700 bg-slate-900 text-slate-400'
                                  }`}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </div>
                                  <span>{opt}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 2. PILIHAN GANDA KOMPLEKS */}
                          {q.type === QuestionType.PILIHAN_GANDA_KOMPLEKS && q.options && (
                            <div className="space-y-3" id={`q-input-pilihan-ganda-kompleks-${q.id}`}>
                              {q.options.map((opt, oIdx) => {
                                const isChecked = Array.isArray(studentAns) && studentAns.includes(oIdx);
                                return (
                                  <button
                                    key={oIdx}
                                    id={`opt-complex-btn-${oIdx}`}
                                    onClick={() => {
                                      const currentList = Array.isArray(studentAns) ? [...studentAns] : [];
                                      let nextList: number[];
                                      if (currentList.includes(oIdx)) {
                                        nextList = currentList.filter(i => i !== oIdx);
                                      } else {
                                        nextList = [...currentList, oIdx];
                                      }
                                      handleSaveAnswer(q.id, nextList);
                                    }}
                                    className={`w-full p-4 rounded-xl text-left border flex items-center gap-4 transition-all text-sm cursor-pointer ${
                                      isChecked
                                        ? 'bg-blue-950/50 border-blue-500 text-blue-100 ring-1 ring-blue-900'
                                        : 'bg-slate-950/30 border-slate-800 text-slate-300 hover:bg-slate-900/50'
                                    }`}
                                  >
                                    <div className={`h-6 w-6 rounded border flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                      isChecked
                                        ? 'bg-blue-600 text-white border-transparent'
                                        : 'border-slate-700 bg-slate-900 text-slate-400'
                                    }`}>
                                      {isChecked ? '✓' : String.fromCharCode(65 + oIdx)}
                                    </div>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* 3. BENAR SALAH */}
                          {q.type === QuestionType.BENAR_SALAH && (
                            <div className="flex gap-4" id={`q-input-benar-salah-${q.id}`}>
                              <button
                                id="btn-true"
                                onClick={() => handleSaveAnswer(q.id, true)}
                                className={`flex-1 py-4 px-6 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                                  studentAns === true
                                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-1 ring-emerald-900'
                                    : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                                }`}
                              >
                                BENAR
                              </button>
                              <button
                                id="btn-false"
                                onClick={() => handleSaveAnswer(q.id, false)}
                                className={`flex-1 py-4 px-6 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                                  studentAns === false
                                    ? 'bg-rose-950/50 border-rose-500 text-rose-300 ring-1 ring-rose-900'
                                    : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                                }`}
                              >
                                SALAH
                              </button>
                            </div>
                          )}

                          {/* 4. MENJODOHKAN */}
                          {q.type === QuestionType.MENJODOHKAN && q.matchingPairs && (
                            <div className="space-y-4" id={`q-input-menjodohkan-${q.id}`}>
                              <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-lg text-xs text-slate-400">
                                Pilih jawaban pasang yang sesuai untuk setiap pernyataan di bawah ini.
                              </div>

                              {q.matchingPairs.map(pair => {
                                const currentMappedValue = studentAns ? studentAns[pair.id] : '';
                                return (
                                  <div key={pair.id} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950/30 border border-slate-800/80 p-4 rounded-xl">
                                    <div className="flex-1 w-full text-slate-200 font-semibold text-sm">
                                      {pair.premise}
                                    </div>
                                    <div className="text-slate-500 font-bold hidden sm:block">➔</div>
                                    <div className="w-full sm:w-64">
                                      <select
                                        value={currentMappedValue}
                                        onChange={(e) => {
                                          const nextMapped = {
                                            ...(studentAns || {}),
                                            [pair.id]: e.target.value
                                          };
                                          handleSaveAnswer(q.id, nextMapped);
                                        }}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                                      >
                                        <option value="">-- Hubungkan Jawaban --</option>
                                        {/* List all shuffled/available responses to select */}
                                        {q.matchingPairs!.map(p => (
                                          <option key={p.id} value={p.response}>{p.response}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 5. ESSAY */}
                          {q.type === QuestionType.ESSAY && (
                            <div className="space-y-2" id={`q-input-essay-${q.id}`}>
                              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Lembar Jawaban Uraian Mandiri
                              </label>
                              <textarea
                                value={studentAns || ''}
                                onChange={(e) => handleSaveAnswer(q.id, e.target.value)}
                                placeholder="Tuliskan jawaban lengkap beserta cara/alasan Anda di sini secara sistematis..."
                                rows={8}
                                className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-sans"
                              />
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Footer Navigation Bar */}
                      <footer className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4 flex-shrink-0 select-none">
                        
                        <button
                          id="prev-question-btn"
                          disabled={currentQuestionIndex === 0}
                          onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} />
                          <span>Sebelumnya</span>
                        </button>

                        {/* "Ragu-ragu" Checkbox Toggle */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="flag-doubt"
                            checked={activeSession.doubtFlags[q.id] || false}
                            onChange={() => handleToggleDoubt(q.id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer"
                          />
                          <label htmlFor="flag-doubt" className="text-xs font-bold text-amber-500 cursor-pointer select-none">
                            Ragu-Ragu
                          </label>
                        </div>

                        <button
                          id="next-question-btn"
                          disabled={currentQuestionIndex === activeExam.questions.length - 1}
                          onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <span>Selanjutnya</span>
                          <ChevronRight size={16} />
                        </button>

                      </footer>

                    </main>
                  </>
                );
              })()}
            </>
          )}

        </div>
      )}

      {/* CONFIRMATION MODAL FOR MANUAL SUBMIT */}
      <AnimatePresence>
        {isConfirmingSubmit && activeExam && activeSession && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-slate-100"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Konfirmasi Pengumpulan Ujian</h3>
                  <p className="text-xs text-slate-400">Mata Pelajaran: {activeExam.subject}</p>
                </div>
              </div>

              {(() => {
                const unansweredCount = activeExam.questions.filter(q => {
                  const ans = activeSession.answers[q.id];
                  if (ans === undefined || ans === null) return true;
                  if (typeof ans === 'string' && ans.trim() === '') return true;
                  if (Array.isArray(ans) && ans.length === 0) return true;
                  return false;
                }).length;

                return (
                  <div className="space-y-3">
                    {unansweredCount > 0 ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <p className="font-bold">Peringatan Soal Belum Terjawab!</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-200/90">
                            Masih terdapat <strong className="font-mono text-white text-xs">{unansweredCount} soal</strong> yang belum Anda jawab dari total {activeExam.questions.length} soal.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle size={18} className="shrink-0 text-emerald-400" />
                        <span>Semua <strong className="font-mono text-white">{activeExam.questions.length} soal</strong> telah berhasil Anda jawab!</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Apakah Anda yakin ingin mengakhiri sesi dan mengumpulkan lembar jawaban ujian sekarang?
                    </p>
                  </div>
                );
              })()}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingSubmit(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-700"
                >
                  Batal / Periksa Soal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFinalSubmit}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
                >
                  <CheckCircle size={15} />
                  <span>Ya, Kumpulkan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUBMIT SUCCESS MESSAGE NOTIFICATION MODAL */}
      <AnimatePresence>
        {submitSuccessMessage && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 text-slate-100"
            >
              <div className="h-14 w-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-base font-bold text-white">Status Pengumpulan Ujian</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{submitSuccessMessage}</p>
              <button
                type="button"
                onClick={() => setSubmitSuccessMessage(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Tutup / Lihat Hasil Sesi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
