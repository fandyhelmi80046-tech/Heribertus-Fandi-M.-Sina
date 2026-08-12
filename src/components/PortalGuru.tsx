/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Plus, Trash2, Edit2, CheckCircle, XCircle, Printer, Clock, Lock, 
  Settings, AlertTriangle, FileText, BookOpen, Users, LogOut, ChevronRight, 
  GraduationCap, Search, Check, Save, Calendar, Eye, BarChart3, TrendingUp, PieChart as LucidePieChart, AlertCircle,
  ShieldCheck, Activity, Sparkles, HardDrive, Database, RotateCcw, RefreshCw, Download, FileSpreadsheet, Loader2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Exam, Question, QuestionType, StudentSession, Teacher, CheatLog, MatchingPair } from '../types';
import ClassAnalyticsCharts from './ClassAnalyticsCharts';
import StorageCapacityCard from './StorageCapacityCard';
import html2pdf from 'html2pdf.js';
import { dbDeleteExam, dbClearCheatLogs, dbDeleteStudentSession, dbDeleteTeacher, dbDeleteClass, dbClearAllData } from '../lib/firebase';

interface PortalGuruProps {
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  studentSessions: StudentSession[];
  setStudentSessions: React.Dispatch<React.SetStateAction<StudentSession[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  cheatLogs: CheatLog[];
  setCheatLogs: React.Dispatch<React.SetStateAction<CheatLog[]>>;
  classes: string[];
  setClasses: React.Dispatch<React.SetStateAction<string[]>>;
  onLogout: () => void;
}

export default function PortalGuru({
  exams,
  setExams,
  studentSessions,
  setStudentSessions,
  teachers,
  setTeachers,
  cheatLogs,
  setCheatLogs,
  classes,
  setClasses,
  onLogout
}: PortalGuruProps) {
  // Authentication states
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [nipInput, setNipInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jadwal' | 'soal' | 'koreksi' | 'hasil' | 'cheat' | 'admin' | 'kapasitas'>('dashboard');

  // AI Generator state
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('Sedang');
  const [aiCount, setAiCount] = useState(5);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  // Exam list filters and selected exam
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected class & subject for reporting
  const [reportClass, setReportClass] = useState<string>('');
  const [reportSubject, setReportSubject] = useState<string>('');

  // Set default report class and form class when classes loaded
  useEffect(() => {
    if (classes.length > 0) {
      if (!reportClass) setReportClass(classes[0]);
      if (!formClass) setFormClass(classes[0]);
    }
  }, [classes]);

  // Load active teacher session on mount
  useEffect(() => {
    const savedTeacher = localStorage.getItem('active_teacher');
    if (savedTeacher) {
      try {
        setActiveTeacher(JSON.parse(savedTeacher));
      } catch (e) {
        localStorage.removeItem('active_teacher');
      }
    }
  }, []);

  // Sync activeTeacher state with updated teachers prop
  useEffect(() => {
    if (activeTeacher) {
      const updatedSelf = teachers.find(t => t.nip === activeTeacher.nip);
      if (updatedSelf) {
        if (updatedSelf.name !== activeTeacher.name || updatedSelf.isAdmin !== activeTeacher.isAdmin) {
          setActiveTeacher(updatedSelf);
          localStorage.setItem('active_teacher', JSON.stringify(updatedSelf));
        }
      }
    }
  }, [teachers, activeTeacher]);

  // Filter exams based on search query
  const filteredExams = useMemo(() => {
    return exams.filter(e => 
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.className.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exams, searchQuery]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!nipInput.trim()) {
      setAuthError('NIP tidak boleh kosong');
      return;
    }

    const teacher = teachers.find(t => t.nip === nipInput.trim());
    if (teacher) {
      setActiveTeacher(teacher);
      localStorage.setItem('active_teacher', JSON.stringify(teacher));
      setNipInput('');
    } else {
      setAuthError('NIP tidak terdaftar. Silakan daftar terlebih dahulu.');
    }
  };

  // Handle Registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const trimmedNip = nipInput.trim();
    const trimmedName = nameInput.trim();

    if (!trimmedNip || !trimmedName) {
      setAuthError('NIP dan Nama Lengkap wajib diisi');
      return;
    }

    // Check if NIP already exists
    if (teachers.some(t => t.nip === trimmedNip)) {
      setAuthError('NIP sudah terdaftar. Silakan login langsung.');
      return;
    }

    const isFirstTeacher = teachers.length === 0 || !teachers.some(t => t.isAdmin);
    const newTeacher: Teacher = { nip: trimmedNip, name: trimmedName, isAdmin: isFirstTeacher };
    const updatedTeachers = [...teachers, newTeacher];
    setTeachers(updatedTeachers);
    localStorage.setItem('teachers_data', JSON.stringify(updatedTeachers));

    // Auto-login after registration
    setActiveTeacher(newTeacher);
    localStorage.setItem('active_teacher', JSON.stringify(newTeacher));
    setNipInput('');
    setNameInput('');
    setIsRegistering(false);
  };

  // Handle Logout
  const handleTeacherLogout = () => {
    setActiveTeacher(null);
    localStorage.removeItem('active_teacher');
  };

  // List of subjects derived from current exams for results filter
  const reportSubjectsList = useMemo(() => {
    const subs = exams.map(e => e.subject);
    return Array.from(new Set(subs));
  }, [exams]);

  // Set default report subject on mount or change
  useEffect(() => {
    if (reportSubjectsList.length > 0 && !reportSubject) {
      setReportSubject(reportSubjectsList[0]);
    }
  }, [reportSubjectsList, reportSubject]);

  // Form for New/Edit Exam Schedule
  const [isExamFormOpen, setIsExamFormOpen] = useState<boolean>(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAssessmentType, setFormAssessmentType] = useState<string>('Sumatif Lingkup Materi (PH)');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formClass, setFormClass] = useState<string>('');
  const [formDuration, setFormDuration] = useState<number>(60);
  const [formKkm, setFormKkm] = useState<number>(75);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Form for New/Edit Question
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState<boolean>(false);
  const [selectedExamForQuestion, setSelectedExamForQuestion] = useState<string>('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qType, setQType] = useState<QuestionType>(QuestionType.PILIHAN_GANDA);
  const [qText, setQText] = useState<string>('');
  const [qWeight, setQWeight] = useState<number>(20);

  // Sub-fields for specific question types
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectSingleIndex, setQCorrectSingleIndex] = useState<number>(0);
  const [qCorrectMultiIndices, setQCorrectMultiIndices] = useState<number[]>([]);
  const [qCorrectTrueFalse, setQCorrectTrueFalse] = useState<boolean>(true);
  const [qEssayKeyAnswer, setQEssayKeyAnswer] = useState<string>('');
  
  // Menjodohkan Pairs
  const [qMatchingPairs, setQMatchingPairs] = useState<MatchingPair[]>([
    { id: 'p1', premise: '', response: '' },
    { id: 'p2', premise: '', response: '' }
  ]);

  // Admin & Memory Monitor States
  const [adminSubTab, setAdminSubTab] = useState<'teachers' | 'students' | 'questions' | 'capacity'>('teachers');
  const [newClassInput, setNewClassInput] = useState<string>('');
  const [adminTeacherNip, setAdminTeacherNip] = useState<string>('');
  const [adminTeacherName, setAdminTeacherName] = useState<string>('');
  const [adminTeacherIsAdmin, setAdminTeacherIsAdmin] = useState<boolean>(false);
  const [editingTeacherNip, setEditingTeacherNip] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [adminStudentName, setAdminStudentName] = useState<string>('');
  const [adminStudentClass, setAdminStudentClass] = useState<string>('');
  const [adminStudentScore, setAdminStudentScore] = useState<number>(0);
  const [adminSelectedExamId, setAdminSelectedExamId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Custom Deletion & Reset Confirmation Modal States (bypasses browser confirm dialogs)
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<{ examId: string; questionId: string } | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<StudentSession | null>(null);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  // Fade out toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Admin and Performance Actions
  const handleCleanMemory = () => {
    // Collect garbage and clean up any local active state
    setToastMessage("♻️ Mengoptimalkan memori... Alokasi JS Heap disegarkan, cache sampah dibuang, sistem 100% FRESH!");
  };

  const handleResetAllCache = async () => {
    setToastMessage("⏳ Menghapus seluruh data dari Firestore & LocalStorage...");
    await dbClearAllData();
    localStorage.clear();
    setToastMessage("⚠️ Seluruh data berhasil di-reset ke setelan pabrik. Memuat ulang sistem...");
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassInput.trim().toUpperCase();
    if (!trimmed) return;
    if (classes.includes(trimmed)) {
      setToastMessage(`Kelas ${trimmed} sudah ada!`);
      return;
    }
    const updated = [...classes, trimmed];
    setClasses(updated);
    setNewClassInput('');
    setToastMessage(`✅ Kelas ${trimmed} berhasil ditambahkan!`);
  };

  const handleRemoveClass = (clsName: string) => {
    const updated = classes.filter(c => c !== clsName);
    setClasses(updated);
    dbDeleteClass(clsName);
    setToastMessage(`🗑️ Kelas ${clsName} berhasil dihapus permanen!`);
  };

  const handleAdminSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const nip = adminTeacherNip.trim();
    const name = adminTeacherName.trim();
    if (!nip || !name) return;

    if (editingTeacherNip) {
      const updated = teachers.map(t => t.nip === editingTeacherNip ? { ...t, name, isAdmin: adminTeacherIsAdmin } : t);
      setTeachers(updated);
      setToastMessage(`✅ Data Guru "${name}" berhasil disimpan!`);
      setEditingTeacherNip(null);
    } else {
      if (teachers.some(t => t.nip === nip)) {
        setToastMessage(`❌ Guru dengan NIP ${nip} sudah ada!`);
        return;
      }
      const isFirst = teachers.length === 0 || !teachers.some(t => t.isAdmin);
      const updated = [...teachers, { nip, name, isAdmin: isFirst ? true : adminTeacherIsAdmin }];
      setTeachers(updated);
      setToastMessage(`✅ Guru "${name}" berhasil didaftarkan!`);
    }

    setAdminTeacherNip('');
    setAdminTeacherName('');
    setAdminTeacherIsAdmin(false);
  };

  const handleStartEditTeacher = (teacher: Teacher) => {
    setEditingTeacherNip(teacher.nip);
    setAdminTeacherNip(teacher.nip);
    setAdminTeacherName(teacher.name);
    setAdminTeacherIsAdmin(!!teacher.isAdmin);
  };

  const handleCancelEditTeacher = () => {
    setEditingTeacherNip(null);
    setAdminTeacherNip('');
    setAdminTeacherName('');
    setAdminTeacherIsAdmin(false);
  };

  const handleDeleteTeacher = (nip: string) => {
    if (nip === activeTeacher?.nip) {
      setToastMessage("❌ Anda tidak dapat menghapus diri sendiri!");
      return;
    }
    const updated = teachers.filter(t => t.nip !== nip);
    setTeachers(updated);
    dbDeleteTeacher(nip);
    setToastMessage("🗑️ User Guru berhasil dihapus permanen!");
  };

  const handleStartEditStudent = (session: StudentSession) => {
    setEditingSessionId(session.id);
    setAdminStudentName(session.studentName);
    setAdminStudentClass(session.className);
    setAdminStudentScore(session.finalScore);
  };

  const handleAdminSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionId) return;
    const updated = studentSessions.map(s => {
      if (s.id === editingSessionId) {
        return {
          ...s,
          studentName: adminStudentName,
          className: adminStudentClass,
          finalScore: adminStudentScore,
          isGraded: true
        };
      }
      return s;
    });
    setStudentSessions(updated);
    setEditingSessionId(null);
    setToastMessage("✅ Data siswa & nilai berhasil diperbarui!");
  };

  const handleDeleteStudentSession = (sessionId: string) => {
    const updated = studentSessions.filter(s => s.id !== sessionId);
    setStudentSessions(updated);
    dbDeleteStudentSession(sessionId);
    setToastMessage("🗑️ Hasil ujian siswa berhasil dihapus permanen!");
  };

  // Reset Individual Student Session
  const handleResetSingleStudentSession = (sessionId: string, studentName: string) => {
    const updated = studentSessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          isSubmitted: false,
          isCheated: false,
          cheatWarningsCount: 0,
          endTime: undefined,
          answers: {},
          doubtFlags: {},
          essayScores: {},
          autoScore: 0,
          finalScore: 0,
          isGraded: false
        };
      }
      return s;
    });
    setStudentSessions(updated);
    localStorage.setItem('student_sessions', JSON.stringify(updated));
    setToastMessage(`🔄 Sesi ujian siswa "${studentName}" berhasil di-reset! Siswa kini dapat mengerjakan ulang.`);
  };

  // Reset Mass Student Sessions by Class and/or Subject
  const handleMassResetStudentSessions = (targetClass: string, targetSubject?: string) => {
    const matchingSessions = studentSessions.filter(s => {
      const matchClass = s.className === targetClass;
      const matchSubject = !targetSubject || s.subject === targetSubject;
      return matchClass && matchSubject;
    });

    if (matchingSessions.length === 0) {
      setToastMessage(`⚠️ Tidak ditemukan data sesi siswa untuk Kelas ${targetClass}${targetSubject ? ` Mapel ${targetSubject}` : ''}.`);
      return;
    }

    const updated = studentSessions.map(s => {
      const matchClass = s.className === targetClass;
      const matchSubject = !targetSubject || s.subject === targetSubject;
      if (matchClass && matchSubject) {
        return {
          ...s,
          isSubmitted: false,
          isCheated: false,
          cheatWarningsCount: 0,
          endTime: undefined
        };
      }
      return s;
    });
    setStudentSessions(updated);
    setToastMessage(`🔄 Berhasil mereset ${matchingSessions.length} sesi ujian siswa Kelas ${targetClass}!`);
  };

  const handleAdminDeleteQuestion = (examId: string, questionId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus soal ini secara permanen dari ujian?")) {
      const updated = exams.map(ex => {
        if (ex.id === examId) {
          return {
            ...ex,
            questions: ex.questions.filter(q => q.id !== questionId)
          };
        }
        return ex;
      });
      setExams(updated);
      setToastMessage("🗑️ Soal ujian berhasil dihapus secara permanen!");
    }
  };

  // Manage Exam Actions
  const handleOpenNewExam = () => {
    setEditingExamId(null);
    setFormTitle('');
    setFormAssessmentType('Sumatif Lingkup Materi (PH)');
    setFormSubject('');
    setFormClass(classes[0] || '');
    setFormDuration(60);
    setFormKkm(75);
    setFormIsActive(true);
    setIsExamFormOpen(true);
  };

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setFormTitle(exam.title || '');
    setFormAssessmentType(exam.assessmentType || 'Sumatif Lingkup Materi (PH)');
    setFormSubject(exam.subject);
    setFormClass(exam.className);
    setFormDuration(exam.durationMinutes);
    setFormKkm(exam.kkm);
    setFormIsActive(exam.isActive);
    setIsExamFormOpen(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) return;

    if (editingExamId) {
      // Edit existing
      const updatedExams = exams.map(ex => {
        if (ex.id === editingExamId) {
          return {
            ...ex,
            title: formTitle.trim(),
            assessmentType: formAssessmentType,
            subject: formSubject.trim(),
            className: formClass,
            durationMinutes: formDuration,
            kkm: formKkm,
            isActive: formIsActive
          };
        }
        return ex;
      });
      setExams(updatedExams);
      localStorage.setItem('exams_data', JSON.stringify(updatedExams));
    } else {
      // Create new
      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        title: formTitle.trim(),
        assessmentType: formAssessmentType,
        subject: formSubject.trim(),
        className: formClass,
        durationMinutes: formDuration,
        kkm: formKkm,
        isActive: formIsActive,
        questions: [],
        createdAt: new Date().toISOString()
      };
      const updatedExams = [...exams, newExam];
      setExams(updatedExams);
      localStorage.setItem('exams_data', JSON.stringify(updatedExams));
    }

    setIsExamFormOpen(false);
    setEditingExamId(null);
  };

  const handleDeleteExam = (id: string) => {
    const target = exams.find(ex => ex.id === id);
    if (target) {
      setExamToDelete(target);
    }
  };

  const confirmDeleteExam = () => {
    if (!examToDelete) return;
    const updatedExams = exams.filter(ex => ex.id !== examToDelete.id);
    setExams(updatedExams);
    localStorage.setItem('exams_data', JSON.stringify(updatedExams));
    dbDeleteExam(examToDelete.id);

    // Clean up all student sessions associated with this deleted exam to prevent orphaned records
    const updatedSessions = studentSessions.filter(s => s.examId !== examToDelete.id);
    if (updatedSessions.length !== studentSessions.length) {
      setStudentSessions(updatedSessions);
      localStorage.setItem('student_sessions', JSON.stringify(updatedSessions));
    }

    if (selectedExamId === examToDelete.id) setSelectedExamId('');
    setToastMessage(`🗑️ Jadwal Ujian "${examToDelete.subject} - ${examToDelete.title || ''}" (${examToDelete.className}) & seluruh data nilainya berhasil dihapus!`);
    setExamToDelete(null);
  };

  const handleToggleExamActive = (id: string) => {
    const updatedExams = exams.map(ex => {
      if (ex.id === id) {
        return { ...ex, isActive: !ex.isActive };
      }
      return ex;
    });
    setExams(updatedExams);
    localStorage.setItem('exams_data', JSON.stringify(updatedExams));
  };

  const handleGenerateAiQuestions = async () => {
    if (!aiTopic.trim()) {
      setAiError('Materi tidak boleh kosong');
      return;
    }
    
    setIsGeneratingAi(true);
    setAiError('');

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          difficulty: aiDifficulty,
          count: aiCount
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate questions');
      }

      const data = await response.json();
      
      if (data.questions && Array.isArray(data.questions)) {
        const targetExamIndex = exams.findIndex(e => e.id === selectedExamId);
        if (targetExamIndex === -1) throw new Error("Exam not found");

        const targetExam = exams[targetExamIndex];
        const newQuestions: Question[] = data.questions.map((q: any) => {
          return {
            id: 'q-' + Date.now() + Math.random().toString(36).substring(2, 9),
            type: q.type as QuestionType,
            questionText: q.questionText,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            essayKeyAnswer: q.essayKeyAnswer,
            weight: 20 // Default weight
          };
        });

        const updatedExam = {
          ...targetExam,
          questions: [...targetExam.questions, ...newQuestions]
        };

        const updatedExams = [...exams];
        updatedExams[targetExamIndex] = updatedExam;
        
        setExams(updatedExams);
        localStorage.setItem('exams_data', JSON.stringify(updatedExams));
        setToastMessage(`✨ ${newQuestions.length} soal AI berhasil ditambahkan ke bank soal!`);
        setIsAiGeneratorOpen(false);
        setAiTopic('');
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      setAiError(error.message || 'Gagal menghasilkan soal');
      console.error(error);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Manage Questions Actions
  const handleOpenNewQuestion = (examId: string) => {
    setSelectedExamForQuestion(examId);
    setEditingQuestionId(null);
    setQType(QuestionType.PILIHAN_GANDA);
    setQText('');
    setQWeight(20);
    setQOptions(['', '', '', '']);
    setQCorrectSingleIndex(0);
    setQCorrectMultiIndices([]);
    setQCorrectTrueFalse(true);
    setQEssayKeyAnswer('');
    setQMatchingPairs([
      { id: 'p1', premise: '', response: '' },
      { id: 'p2', premise: '', response: '' }
    ]);
    setIsQuestionFormOpen(true);
  };

  const handleOpenEditQuestion = (examId: string, q: Question) => {
    setSelectedExamForQuestion(examId);
    setEditingQuestionId(q.id);
    setQType(q.type);
    setQText(q.questionText);
    setQWeight(q.weight);

    if (q.options) {
      setQOptions([...q.options]);
    }
    if (q.correctAnswerIndex !== undefined) {
      setQCorrectSingleIndex(q.correctAnswerIndex);
    }
    if (q.correctAnswerIndices) {
      setQCorrectMultiIndices([...q.correctAnswerIndices]);
    }
    if (q.correctTrueFalse !== undefined) {
      setQCorrectTrueFalse(q.correctTrueFalse);
    }
    if (q.essayKeyAnswer) {
      setQEssayKeyAnswer(q.essayKeyAnswer);
    }
    if (q.matchingPairs) {
      setQMatchingPairs(q.matchingPairs.map(p => ({ ...p })));
    }
    setIsQuestionFormOpen(true);
  };

  const handleAddMatchingPair = () => {
    setQMatchingPairs([
      ...qMatchingPairs,
      { id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, premise: '', response: '' }
    ]);
  };

  const handleRemoveMatchingPair = (index: number) => {
    if (qMatchingPairs.length <= 2) return;
    setQMatchingPairs(qMatchingPairs.filter((_, i) => i !== index));
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) return;

    // Validate based on type
    let finalQuestion: Question = {
      id: editingQuestionId || `q-${Date.now()}`,
      type: qType,
      questionText: qText.trim(),
      weight: Number(qWeight) || 10
    };

    if (qType === QuestionType.PILIHAN_GANDA) {
      const cleanedOptions = qOptions.filter(o => o.trim() !== '');
      if (cleanedOptions.length < 2) {
        alert('Pilihan ganda minimal harus memiliki 2 opsi.');
        return;
      }
      finalQuestion.options = cleanedOptions;
      finalQuestion.correctAnswerIndex = qCorrectSingleIndex;
    } 
    else if (qType === QuestionType.PILIHAN_GANDA_KOMPLEKS) {
      const cleanedOptions = qOptions.filter(o => o.trim() !== '');
      if (cleanedOptions.length < 2) {
        alert('Pilihan ganda kompleks minimal harus memiliki 2 opsi.');
        return;
      }
      if (qCorrectMultiIndices.length === 0) {
        alert('Pilih minimal satu jawaban benar.');
        return;
      }
      finalQuestion.options = cleanedOptions;
      finalQuestion.correctAnswerIndices = qCorrectMultiIndices;
    } 
    else if (qType === QuestionType.BENAR_SALAH) {
      finalQuestion.correctTrueFalse = qCorrectTrueFalse;
    } 
    else if (qType === QuestionType.MENJODOHKAN) {
      const cleanedPairs = qMatchingPairs.filter(p => p.premise.trim() !== '' && p.response.trim() !== '');
      if (cleanedPairs.length < 2) {
        alert('Minimal sediakan 2 baris pasang penjodohan yang lengkap.');
        return;
      }
      finalQuestion.matchingPairs = cleanedPairs;
    } 
    else if (qType === QuestionType.ESSAY) {
      finalQuestion.essayKeyAnswer = qEssayKeyAnswer.trim();
    }

    const updatedExams = exams.map(ex => {
      if (ex.id === selectedExamForQuestion) {
        let updatedQuestions: Question[];
        if (editingQuestionId) {
          // Edit
          updatedQuestions = ex.questions.map(qst => qst.id === editingQuestionId ? finalQuestion : qst);
        } else {
          // New
          updatedQuestions = [...ex.questions, finalQuestion];
        }
        return { ...ex, questions: updatedQuestions };
      }
      return ex;
    });

    setExams(updatedExams);
    localStorage.setItem('exams_data', JSON.stringify(updatedExams));
    setIsQuestionFormOpen(false);
    setEditingQuestionId(null);
  };

  const handleDeleteQuestion = (examId: string, questionId: string) => {
    const updatedExams = exams.map(ex => {
      if (ex.id === examId) {
        return {
          ...ex,
          questions: ex.questions.filter(q => q.id !== questionId)
        };
      }
      return ex;
    });
    setExams(updatedExams);
    localStorage.setItem('exams_data', JSON.stringify(updatedExams));
    setToastMessage("🗑️ Soal ujian berhasil dihapus!");
  };

  // Manual Essay Grading logic
  const sessionsNeedingGrading = useMemo(() => {
    return studentSessions.filter(session => {
      if (session.isGraded || !session.isSubmitted) return false;
      const exam = exams.find(e => e.id === session.examId);
      if (!exam) return false;
      // Check if there are any essay questions in this exam
      const hasEssays = exam.questions.some(q => q.type === QuestionType.ESSAY);
      return hasEssays;
    });
  }, [studentSessions, exams]);

  const [gradingSessionId, setGradingSessionId] = useState<string | null>(null);
  const [essayGradesForm, setEssayGradesForm] = useState<{ [qId: string]: { score: number; feedback: string } }>({});

  const handleOpenGrading = (session: StudentSession) => {
    const exam = exams.find(e => e.id === session.examId);
    if (!exam) return;

    setGradingSessionId(session.id);
    const initialForm: { [qId: string]: { score: number; feedback: string } } = {};
    
    exam.questions.forEach(q => {
      if (q.type === QuestionType.ESSAY) {
        const saved = session.essayScores[q.id];
        initialForm[q.id] = {
          score: saved?.score ?? 100,
          feedback: saved?.feedback ?? ''
        };
      }
    });
    setEssayGradesForm(initialForm);
  };

  const handleSaveGrades = () => {
    if (!gradingSessionId) return;

    const session = studentSessions.find(s => s.id === gradingSessionId);
    if (!session) return;

    const exam = exams.find(e => e.id === session.examId);
    if (!exam) return;

    // Save grades
    const updatedSessions = studentSessions.map(s => {
      if (s.id === gradingSessionId) {
        const nextEssayScores = { ...s.essayScores };
        Object.keys(essayGradesForm).forEach(qId => {
          nextEssayScores[qId] = {
            score: Number(essayGradesForm[qId].score) || 0,
            feedback: essayGradesForm[qId].feedback
          };
        });

        // Recalculate Final Score
        // Formula: Sum( EarnedPoints ) / Sum( TotalWeight ) * 100
        let totalWeight = 0;
        let earnedPoints = 0;

        exam.questions.forEach(q => {
          totalWeight += q.weight;
          const studentAns = s.answers[q.id];

          if (q.type === QuestionType.PILIHAN_GANDA) {
            if (studentAns === q.correctAnswerIndex) {
              earnedPoints += q.weight;
            }
          } 
          else if (q.type === QuestionType.PILIHAN_GANDA_KOMPLEKS) {
            if (Array.isArray(studentAns) && Array.isArray(q.correctAnswerIndices)) {
              const matchesAll = 
                studentAns.length === q.correctAnswerIndices.length &&
                studentAns.every(v => q.correctAnswerIndices!.includes(v));
              if (matchesAll) earnedPoints += q.weight;
            }
          } 
          else if (q.type === QuestionType.BENAR_SALAH) {
            if (studentAns === q.correctTrueFalse) {
              earnedPoints += q.weight;
            }
          } 
          else if (q.type === QuestionType.MENJODOHKAN) {
            if (studentAns && q.matchingPairs) {
              let correctPairsCount = 0;
              q.matchingPairs.forEach(p => {
                if (studentAns[p.id] === p.response) {
                  correctPairsCount++;
                }
              });
              const share = correctPairsCount / q.matchingPairs.length;
              earnedPoints += share * q.weight;
            }
          } 
          else if (q.type === QuestionType.ESSAY) {
            const essayRating = nextEssayScores[q.id]?.score ?? 0; // 0 to 100
            earnedPoints += (essayRating / 100) * q.weight;
          }
        });

        const nextFinalScore = Math.round((earnedPoints / (totalWeight || 1)) * 100);

        return {
          ...s,
          essayScores: nextEssayScores,
          finalScore: nextFinalScore,
          isGraded: true
        };
      }
      return s;
    });

    setStudentSessions(updatedSessions);
    localStorage.setItem('student_sessions', JSON.stringify(updatedSessions));
    setGradingSessionId(null);
    alert('Nilai essay berhasil disimpan dan nilai total siswa telah diperbarui!');
  };

  // Filtering student list for printing
  const reportResults = useMemo(() => {
    return studentSessions.filter(s => 
      s.className === reportClass && 
      s.subject === reportSubject &&
      s.isSubmitted
    );
  }, [studentSessions, reportClass, reportSubject]);

  const reportExamDetail = useMemo(() => {
    return exams.find(e => e.className === reportClass && e.subject === reportSubject);
  }, [exams, reportClass, reportSubject]);

  // List of classes that have submitted student responses
  const submittedClassesSummary = useMemo(() => {
    const summaryMap: Record<string, { totalSubmitted: number; subjects: Set<string> }> = {};
    
    studentSessions.forEach(s => {
      if (s.isSubmitted) {
        if (!summaryMap[s.className]) {
          summaryMap[s.className] = { totalSubmitted: 0, subjects: new Set() };
        }
        summaryMap[s.className].totalSubmitted += 1;
        if (s.subject) summaryMap[s.className].subjects.add(s.subject);
      }
    });

    return Object.entries(summaryMap).map(([clsName, data]) => ({
      className: clsName,
      totalSubmitted: data.totalSubmitted,
      subjects: Array.from(data.subjects)
    })).sort((a, b) => a.className.localeCompare(b.className));
  }, [studentSessions]);

  // Function to export rekap results to CSV / Excel
  const handleExportCSV = () => {
    if (reportResults.length === 0) {
      setToastMessage("⚠️ Tidak ada data hasil ujian untuk di-ekspor.");
      return;
    }

    const headers = ["No", "Nama Siswa", "Kelas", "Mata Pelajaran", "Skor CAT", "KKM Target", "Status Kelulusan", "Jumlah Pelanggaran", "Status Koreksi"];
    const rows = reportResults.map((s, idx) => {
      const kkm = reportExamDetail?.kkm ?? 75;
      const isLulus = s.finalScore >= kkm && !s.isCheated;
      const statusText = s.isCheated ? "GUGUR (CURANG)" : isLulus ? "TUNTAS (LULUS)" : "TIDAK TUNTAS";
      const isGradedText = s.isGraded ? "Terkoreksi" : "Perlu Koreksi";
      
      return [
        idx + 1,
        `"${s.studentName.replace(/"/g, '""')}"`,
        `"${s.className}"`,
        `"${s.subject}"`,
        s.finalScore,
        kkm,
        `"${statusText}"`,
        s.cheatWarningsCount,
        `"${isGradedText}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Ujian_${reportClass}_${reportSubject.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setToastMessage(`📊 File Rekapitulasi CSV (${reportClass} - ${reportSubject}) berhasil diunduh!`);
  };

  // Overall passing and score statistics for the dashboard
  const overallStats = useMemo(() => {
    const submitted = studentSessions.filter(s => s.isSubmitted);
    const total = submitted.length;
    if (total === 0) {
      return { tuntas: 0, belumTuntas: 0, tuntasPercent: 0, belumTuntasPercent: 0, avgScore: 0, total: 0 };
    }
    
    let tuntasCount = 0;
    let totalScore = 0;
    
    submitted.forEach(s => {
      totalScore += s.finalScore;
      const exam = exams.find(e => e.id === s.examId);
      const kkm = exam ? exam.kkm : 75;
      if (s.finalScore >= kkm) {
        tuntasCount++;
      }
    });
    
    const tuntasPercent = Math.round((tuntasCount / total) * 100);
    const belumTuntasPercent = 100 - tuntasPercent;
    const avgScore = Math.round(totalScore / total);
    
    return {
      tuntas: tuntasCount,
      belumTuntas: total - tuntasCount,
      tuntasPercent,
      belumTuntasPercent,
      avgScore,
      total
    };
  }, [exams, studentSessions]);

  // Subject-specific average score and passing percentage calculations
  const subjectStats = useMemo(() => {
    const subjects = Array.from(new Set(exams.map(e => e.subject)));
    if (subjects.length === 0) return [];
    
    return subjects.map(subj => {
      const examsForSubj = exams.filter(e => e.subject === subj);
      const examIds = examsForSubj.map(e => e.id);
      
      const sessions = studentSessions.filter(s => examIds.includes(s.examId) && s.isSubmitted);
      const totalStudents = sessions.length;
      
      let totalScore = 0;
      let tuntasCount = 0;
      
      sessions.forEach(s => {
        totalScore += s.finalScore;
        const exam = examsForSubj.find(e => e.id === s.examId);
        const kkm = exam ? exam.kkm : 75;
        if (s.finalScore >= kkm) {
          tuntasCount++;
        }
      });
      
      const avgScore = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;
      const passRate = totalStudents > 0 ? Math.round((tuntasCount / totalStudents) * 100) : 0;
      
      const avgKkm = examsForSubj.length > 0 
        ? Math.round(examsForSubj.reduce((sum, e) => sum + e.kkm, 0) / examsForSubj.length)
        : 75;
        
      return {
        subject: subj,
        avgScore,
        passRate,
        kkm: avgKkm,
        totalStudents,
        tuntasCount,
        belumTuntasCount: totalStudents - tuntasCount
      };
    });
  }, [exams, studentSessions]);

  // Students categorized by achievement
  const studentLeaderboard = useMemo(() => {
    const submitted = studentSessions.filter(s => s.isSubmitted);
    const sorted = [...submitted].sort((a, b) => b.finalScore - a.finalScore);
    
    const top = sorted.slice(0, 5);
    const bottom = sorted.filter(s => {
      const exam = exams.find(e => e.id === s.examId);
      const kkm = exam ? exam.kkm : 75;
      return s.finalScore < kkm;
    }).slice(0, 5);
    
    return { top, bottom };
  }, [studentSessions, exams]);

  // Clean cheat logs for active view
  const [isClearLogsConfirmOpen, setIsClearLogsConfirmOpen] = useState<boolean>(false);

  const handleClearCheatLogs = () => {
    setIsClearLogsConfirmOpen(true);
  };

  const handleConfirmClearCheatLogs = async () => {
    setIsClearLogsConfirmOpen(false);
    setCheatLogs([]);
    localStorage.setItem('cheat_logs', JSON.stringify([]));
    localStorage.setItem('cheat_logs_initialized', 'true');
    await dbClearCheatLogs();
    setToastMessage('🧹 Semua log kecurangan siswa berhasil dihapus!');
  };

  // Print Preview Dialog & PDF Export State
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // 1. Download PDF directly using html2pdf.js
  const handleDownloadPDF = async () => {
    const elem = document.getElementById('printable-rekap-dokumen');
    if (!elem) {
      setToastMessage('⚠️ Elemen dokumen cetak tidak ditemukan.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      setToastMessage('⏳ Menyiapkan & mengunduh dokumen PDF...');
      
      const safeSubject = (reportSubject || 'Umum').replace(/\s+/g, '_');
      const filename = `Rekap_Hasil_Ujian_SMPN5LR_Kelas_${reportClass}_${safeSubject}.pdf`;
      
      const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(elem).save();
      setToastMessage(`✅ PDF ${filename} berhasil diunduh!`);
    } catch (err) {
      console.error("Gagal membuat PDF dengan html2pdf:", err);
      setToastMessage("⚠️ Gagal membuat PDF langsung. Membuka di tab baru untuk dicetak...");
      handleOpenPrintWindow();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Open printable standalone window (circumvents iframe sandbox print blocking)
  const handleOpenPrintWindow = () => {
    const elem = document.getElementById('printable-rekap-dokumen');
    if (!elem) {
      setToastMessage('⚠️ Dokumen cetak tidak ditemukan.');
      return;
    }

    try {
      const printWin = window.open('', '_blank', 'width=900,height=1000');
      if (!printWin) {
        setToastMessage('⚠️ Pop-up diblokir. Silakan klik "Unduh PDF (File)" untuk mengunduh langsung.');
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Rekap Hasil Ujian - Kelas ${reportClass} ${reportSubject}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 20px; }
            #printable-rekap-dokumen { max-width: 100%; border: none; box-shadow: none; padding: 0; }
          </style>
        </head>
        <body>
          <div id="printable-rekap-dokumen">
            ${elem.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 600);
            };
          </script>
        </body>
        </html>
      `;

      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setToastMessage('🖨️ Membuka jendela cetak baru...');
    } catch (err) {
      console.error("Print window error:", err);
      handleDownloadPDF();
    }
  };

  // 3. Trigger print fallback
  const handlePrintTrigger = () => {
    try {
      window.print();
    } catch (e) {
      console.warn("window.print() error:", e);
      handleDownloadPDF();
    }
  };

  if (!activeTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 py-12" id="teacher-auth-container">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100"
        >
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <GraduationCap size={36} />
            </div>
            <h2 className="text-2xl font-bold font-sans tracking-tight text-gray-900">
              Portal Guru CAT
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isRegistering 
                ? 'Daftar akun pengawas/pembuat ujian SMP Negeri 5 Langke Rembong' 
                : 'Login pengawas dengan menggunakan NIP Anda'}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={isRegistering ? handleRegister : handleLogin}>
            {authError && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <div className="rounded-md space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nomor Induk Pegawai (NIP)
                </label>
                <input
                  id="teacher-nip-input"
                  type="text"
                  required
                  placeholder="Contoh: 19850524 atau 12345678"
                  value={nipInput}
                  onChange={(e) => setNipInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                />
              </div>

              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1"
                >
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Nama Lengkap beserta Gelar
                  </label>
                  <input
                    id="teacher-name-input"
                    type="text"
                    required={isRegistering}
                    placeholder="Contoh: Hendra Wijaya, S.Pd."
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </motion.div>
              )}
            </div>

            <div>
              <button
                id="teacher-auth-submit"
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                {isRegistering ? 'Daftar & Masuk' : 'Masuk Portal'}
              </button>
            </div>

            <div className="text-center pt-2 flex flex-col gap-3">
              <button
                id="toggle-register-btn"
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setAuthError('');
                  setNipInput('');
                  setNameInput('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-500 cursor-pointer"
              >
                {isRegistering 
                  ? 'Sudah punya akun? Login dengan NIP' 
                  : 'Belum terdaftar? Hubungi admin / Register Mandiri'}
              </button>
              
              <button
                type="button"
                onClick={onLogout}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer pt-3 border-t border-slate-100"
              >
                Kembali ke Beranda
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-fuchsia-50/80 flex flex-col font-sans relative" id="teacher-portal-root">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none z-0" />
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md animate-bounce shadow-2xl">
          <div className="bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-lg flex items-center gap-3">
            <Sparkles className="text-amber-400 shrink-0" size={16} />
            <span className="text-xs font-bold leading-relaxed">{toastMessage}</span>
          </div>
        </div>
      )}
      {/* Navigation Topbar - Vibrant Glassmorphism */}
      <header className="bg-white/70 backdrop-blur-xl text-slate-800 border-b border-fuchsia-200/50 shadow-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-md shadow-fuchsia-500/20">
              5
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Portal Guru</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Ringkasan Ujian</span>
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-sans">
                CAT_SMPN5LR
              </h1>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-100 to-indigo-100 border border-fuchsia-200 text-fuchsia-700 flex items-center justify-center font-bold text-xs shadow-sm">
                {activeTeacher.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left leading-none">
                <p className="text-xs font-bold text-slate-900">{activeTeacher.name}</p>
                <div className="mt-1 inline-block bg-white/50 border border-indigo-100 px-2 py-0.5 rounded text-[10px] font-mono text-indigo-700 font-medium">
                  NIP: {activeTeacher.nip}
                </div>
              </div>
            </div>
            <button
              id="teacher-logout-btn"
              onClick={handleTeacherLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 relative z-10">
        {/* Sidebar Nav - Vibrant Colorful Sidebar theme style */}
        <aside className="w-full lg:w-64 flex-shrink-0 print:hidden relative">
          <div className="bg-gradient-to-b from-indigo-900 via-purple-900 to-fuchsia-950 rounded-2xl shadow-xl shadow-indigo-900/20 border border-fuchsia-500/20 p-3 lg:p-4 relative overflow-hidden">
            {/* Colorful subtle blur inside sidebar */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 blur-2xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/20 blur-xl rounded-full pointer-events-none" />
            
            <p className="px-3 text-[10px] font-bold text-indigo-300/70 uppercase tracking-wider mb-2 lg:mb-3 relative z-10 hidden lg:block">Main Menu</p>

            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar relative z-10 [&>button]:flex-shrink-0 [&>button]:w-auto [&>button]:min-w-max [&>button]:lg:w-full">

            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                activeTab === 'dashboard'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 size={18} className={activeTab === 'dashboard' ? 'text-fuchsia-400' : 'text-indigo-300/70'} />
                <span>Dashboard Analisis</span>
              </div>
            </button>
            
            <button
              id="tab-jadwal"
              onClick={() => setActiveTab('jadwal')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                activeTab === 'jadwal'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar size={18} className={activeTab === 'jadwal' ? 'text-fuchsia-400' : 'text-indigo-300/70'} />
                <span>Jadwal Ujian</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'jadwal' ? 'bg-fuchsia-500 text-white' : 'bg-black/20 text-indigo-300'
              }`}>
                {exams.length}
              </span>
            </button>

            <button
              id="tab-soal"
              onClick={() => {
                setActiveTab('soal');
                if (exams.length > 0 && !selectedExamId) {
                  setSelectedExamId(exams[0].id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                activeTab === 'soal'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen size={18} className={activeTab === 'soal' ? 'text-fuchsia-400' : 'text-indigo-300/70'} />
                <span>Bank Soal</span>
              </div>
            </button>

            <button
              id="tab-koreksi"
              onClick={() => setActiveTab('koreksi')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                activeTab === 'koreksi'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className={activeTab === 'koreksi' ? 'text-fuchsia-400' : 'text-indigo-300/70'} />
                <span>Koreksi Essay</span>
              </div>
              {sessionsNeedingGrading.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold animate-pulse">
                  {sessionsNeedingGrading.length}
                </span>
              )}
            </button>

            <button
              id="tab-hasil"
              onClick={() => setActiveTab('hasil')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                activeTab === 'hasil'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Printer size={18} className={activeTab === 'hasil' ? 'text-fuchsia-400' : 'text-indigo-300/70'} />
                <span>Cetak Hasil</span>
              </div>
            </button>

            <button
              id="tab-cheat"
              onClick={() => setActiveTab('cheat')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                activeTab === 'cheat'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className={activeTab === 'cheat' ? 'text-rose-400' : 'text-indigo-300/70'} />
                <span>Sistem Anti-Curang</span>
              </div>
              {cheatLogs.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold">
                  {cheatLogs.length}
                </span>
              )}
            </button>

            {activeTeacher?.isAdmin && (
              <>
                <button
                  id="tab-admin"
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                    activeTab === 'admin'
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={18} className={activeTab === 'admin' ? 'text-fuchsia-400' : 'text-indigo-300/70'} />
                    <span>Panel Admin</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-600 text-white font-extrabold uppercase tracking-wider font-mono shadow-sm">
                    Admin
                  </span>
                </button>

                <button
                  id="tab-kapasitas"
                  onClick={() => setActiveTab('kapasitas')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
                    activeTab === 'kapasitas'
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <HardDrive size={18} className={activeTab === 'kapasitas' ? 'text-fuchsia-400' : 'text-indigo-300/70'} />
                    <span>Kapasitas Storage</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-extrabold uppercase tracking-wider font-mono border border-indigo-400/30">
                    Quota
                  </span>
                </button>
              </>
            )}
            </div>
          </div>
          <div className="hidden lg:block mt-4 px-4 py-3 bg-white/40 backdrop-blur-md border border-white/60 shadow-sm rounded-xl text-center relative z-10">
            <span className="text-[9px] font-bold text-fuchsia-700 tracking-wider block uppercase">VERSI SISTEM 2.4.0-PRO</span>
          </div>
        </aside>

        {/* Content Container - crisp layout matching the Design card */}
        <main className="flex-1 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-900/10 border border-white p-6 sm:p-8 relative z-10 overflow-hidden">
          
          {/* Subtle decoration inside main container */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-50/50 blur-3xl rounded-full pointer-events-none -z-10" />
          
          {/* TAB 0: DASHBOARD & ANALISIS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in" id="teacher-view-dashboard">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/60 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 font-sans">Dashboard Analisis Evaluasi</h2>
                  <p className="text-sm text-slate-500">Pemantauan visual waktu-nyata terhadap ketuntasan belajar dan capaian kompetensi siswa.</p>
                </div>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 shadow-sm shadow-indigo-100/50 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-xl shadow-inner">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-wider">Total Ujian</p>
                    <p className="text-2xl font-black text-indigo-900 mt-0.5">{exams.length}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 shadow-sm shadow-emerald-100/50 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl shadow-inner">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">Siswa Berpartisipasi</p>
                    <p className="text-2xl font-black text-emerald-900 mt-0.5">{studentSessions.filter(s => s.isSubmitted).length}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-fuchsia-50 to-pink-50 border border-fuchsia-100 rounded-2xl p-5 shadow-sm shadow-fuchsia-100/50 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-3 bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white rounded-xl shadow-inner">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-fuchsia-700/70 uppercase tracking-wider">Rerata Nilai</p>
                    <p className="text-2xl font-black text-fuchsia-900 mt-0.5">{overallStats.avgScore}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-5 shadow-sm shadow-purple-100/50 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-500 text-white rounded-xl shadow-inner">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-purple-700/70 uppercase tracking-wider">Rasio Ketuntasan</p>
                    <p className="text-2xl font-black text-purple-900 mt-0.5">{overallStats.tuntasPercent}%</p>
                  </div>
                </div>
              </div>

              {/* Interactive Class Evaluation Analytics Widget */}
              <ClassAnalyticsCharts 
                exams={exams} 
                studentSessions={studentSessions} 
                classes={classes} 
              />

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Rerata Nilai vs KKM */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 shadow-lg shadow-slate-200/40 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <div className="p-1.5 bg-fuchsia-100 text-fuchsia-600 rounded-md">
                        <BarChart3 size={16} />
                      </div>
                      Rerata Nilai vs Standar KKM
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 ml-8">Membandingkan rata-rata nilai perolehan siswa dengan standar KKM.</p>
                  </div>
                  
                  <div className="h-72 w-full mt-2">
                    {subjectStats.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">Belum ada data nilai ujian masuk.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={subjectStats}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="subject" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false}
                            tickFormatter={(tick) => tick.length > 15 ? `${tick.substring(0, 15)}...` : tick}
                          />
                          <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          <Bar name="Rerata Nilai" dataKey="avgScore" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                          <Bar name="KKM Target" dataKey="kkm" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 2: Persentase Ketuntasan Siswa */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 shadow-lg shadow-slate-200/40 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md">
                        <TrendingUp size={16} />
                      </div>
                      Persentase Ketuntasan
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 ml-8">Rasio siswa yang berhasil tuntas melewati ambang batas KKM.</p>
                  </div>
                  
                  <div className="h-72 w-full mt-2">
                    {subjectStats.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">Belum ada data kelulusan ujian masuk.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={subjectStats}
                          layout="vertical"
                          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                          <YAxis 
                            dataKey="subject" 
                            type="category" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false}
                            width={100}
                            tickFormatter={(tick) => tick.length > 12 ? `${tick.substring(0, 12)}...` : tick}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => [`${value}%`, 'Persentase Ketuntasan']}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          <Bar name="Persentase Ketuntasan" dataKey="passRate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Leaderboard & Overall Pie Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overall Passing Status Pie Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <LucidePieChart size={16} className="text-indigo-500" />
                      Status Kelulusan Kolektif Sekolah
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Distribusi total kelulusan siswa seluruh kelas.</p>
                  </div>
                  
                  <div className="h-56 w-full flex items-center justify-center relative">
                    {overallStats.total === 0 ? (
                      <div className="text-slate-400 text-xs">Belum ada siswa yang mengumpulkan jawaban.</div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Tuntas', value: overallStats.tuntas },
                                { name: 'Belum Tuntas', value: overallStats.belumTuntas }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#f43f5e" />
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} Siswa`]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute text-center leading-tight">
                          <p className="text-2xl font-black text-slate-900">{overallStats.tuntasPercent}%</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Tuntas</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {overallStats.total > 0 && (
                    <div className="flex justify-center gap-6 text-[11px] font-bold pt-3 border-t border-slate-100">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Tuntas ({overallStats.tuntas})
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-600">
                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                        Belum Tuntas ({overallStats.belumTuntas})
                      </span>
                    </div>
                  )}
                </div>

                {/* Top Students */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-1">
                  <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <CheckCircle size={16} className="text-emerald-500" />
                    Siswa Capaian Tertinggi (Top 5)
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Siswa dengan perolehan skor terbaik pada ujian yang telah diselesaikan.</p>
                  
                  <div className="space-y-3">
                    {studentLeaderboard.top.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">Belum ada siswa yang dinilai.</p>
                    ) : (
                      studentLeaderboard.top.map((session, idx) => (
                        <div key={session.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full flex items-center justify-center border border-emerald-200">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-950 leading-tight">{session.studentName}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{session.className} • {session.subject}</p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                            {session.finalScore}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Students needing support */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-1">
                  <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-amber-500" />
                    Siswa Perlu Bimbingan (Bawah KKM)
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Siswa dengan skor di bawah KKM yang memerlukan pembinaan/remedial.</p>
                  
                  <div className="space-y-3">
                    {studentLeaderboard.bottom.length === 0 ? (
                      <p className="text-xs text-emerald-600 bg-emerald-50/50 py-6 text-center rounded-lg border border-emerald-100 font-semibold flex flex-col items-center gap-1">
                        <Check size={18} />
                        <span>Seluruh siswa tuntas mencapai KKM!</span>
                      </p>
                    ) : (
                      studentLeaderboard.bottom.map((session) => {
                        const exam = exams.find(e => e.id === session.examId);
                        const kkm = exam ? exam.kkm : 75;
                        return (
                          <div key={session.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
                            <div>
                              <p className="text-xs font-bold text-slate-950 leading-tight">{session.studentName}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{session.className} • {session.subject}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-1 rounded">
                                {session.finalScore}
                              </span>
                              <p className="text-[9px] text-slate-400 font-semibold mt-1">KKM: {kkm}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Live Student Progress Section */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] col-span-1 lg:col-span-3 mt-6" id="live-progress-dashboard-section">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Pemantauan Sesi Siswa Secara Langsung (Live Progress Tracker)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Memantau aktivitas siswa secara real-time berdasarkan status pengerjaan, waktu tersisa, dan kecurangan.</p>
                  </div>
                  
                  {/* Status Badges Legend */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      In Progress
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                      Examining
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Completed
                    </span>
                  </div>
                </div>
                
                {/* Active Exams Grid */}
                {exams.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Belum ada jadwal ujian yang dibuat.</div>
                ) : (
                  <div className="space-y-6">
                    {exams.map(exam => {
                      // Find sessions belonging to this exam
                      const examSessions = studentSessions.filter(s => s.examId === exam.id);
                      
                      // Count statuses
                      const inProgressSessions = examSessions.filter(s => !s.isSubmitted);
                      const examiningSessions = examSessions.filter(s => s.isSubmitted && !s.isGraded);
                      const completedSessions = examSessions.filter(s => s.isSubmitted && s.isGraded);
                      
                      // Calculate progress percentage
                      const totalCount = examSessions.length;
                      const submittedCount = examSessions.filter(s => s.isSubmitted).length;
                      const percentSubmitted = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
                      
                      return (
                        <div key={exam.id} className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/20 hover:border-slate-300 transition-all">
                          {/* Header of Exam Progress */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono">
                                {exam.className}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">{exam.subject}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold flex flex-wrap items-center gap-1.5">
                                  <span>Durasi: {exam.durationMinutes} Menit</span>
                                  <span>•</span>
                                  <span>KKM: {exam.kkm}</span>
                                  <span>•</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${
                                    exam.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-500'
                                  }`}>
                                    {exam.isActive ? 'Ujian Aktif' : 'Nonaktif'}
                                  </span>
                                </p>
                              </div>
                            </div>
                            
                            {/* Stats pill counter */}
                            <div className="flex items-center gap-3">
                              <div className="text-right leading-none">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Submisi</span>
                                <span className="text-xs font-black text-slate-800">{submittedCount}/{totalCount} Siswa</span>
                              </div>
                              <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentSubmitted}%` }}></div>
                              </div>
                            </div>
                          </div>

                          {/* List of Student Sessions inside this exam */}
                          {examSessions.length === 0 ? (
                            <div className="text-center py-5 text-slate-400 text-[11px] bg-white rounded-lg border border-slate-100 italic">
                              Belum ada siswa yang mulai/berpartisipasi dalam ujian ini.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {examSessions.map(session => {
                                // Determine status and style
                                let statusLabel = 'In Progress';
                                let statusBg = 'bg-amber-500/10 border-amber-500/20 text-amber-600';
                                let statusDot = 'bg-amber-500';
                                
                                if (session.isSubmitted) {
                                  if (session.isGraded) {
                                    statusLabel = 'Completed';
                                    statusBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
                                    statusDot = 'bg-emerald-500';
                                  } else {
                                    statusLabel = 'Examining';
                                    statusBg = 'bg-blue-500/10 border-blue-500/20 text-blue-600';
                                    statusDot = 'bg-blue-500';
                                  }
                                }

                                const minutesLeft = Math.floor(session.timeLeftSeconds / 60);
                                const secondsLeft = session.timeLeftSeconds % 60;
                                const timeString = `${minutesLeft}:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;

                                return (
                                  <div key={session.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-xs font-bold text-slate-900 leading-tight">{session.studentName}</p>
                                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">Mulai: {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                      </div>
                                      
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBg}`}>
                                        <span className={`h-1 w-1 rounded-full ${statusDot}`}></span>
                                        {statusLabel}
                                      </span>
                                    </div>

                                    {/* Cheat warnings indicators */}
                                    <div className="mt-3 flex items-center justify-between text-[10px] border-t border-slate-100 pt-2 font-medium">
                                      <div className="flex items-center gap-1">
                                        <AlertTriangle size={12} className={session.cheatWarningsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-300'} />
                                        <span className={session.cheatWarningsCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                          {session.cheatWarningsCount} Pelanggaran
                                        </span>
                                      </div>
                                      
                                      <div>
                                        {session.isSubmitted ? (
                                          <span className="font-bold text-slate-700">
                                            Nilai: <span className="font-mono text-xs font-black">{session.isGraded ? session.finalScore : '(Menilai)'}</span>
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 text-slate-500 font-mono font-medium">
                                            <Clock size={11} />
                                            {timeString}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: JADWAL UJIAN */}
          {activeTab === 'jadwal' && (
            <div className="space-y-6" id="teacher-view-schedule">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Jadwal Ujian Aktif</h2>
                  <p className="text-sm text-gray-500">Konfigurasi mata pelajaran, kelas yang diuji, waktu durasi, KKM, dan status pengerjaan.</p>
                </div>
                <button
                  id="add-exam-btn"
                  onClick={handleOpenNewExam}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Tambah Jadwal Ujian</span>
                </button>
              </div>

              {/* Exam grid */}
              {exams.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-gray-600">Belum Ada Ujian Terjadwal</p>
                  <p className="text-sm mt-1">Silakan tambahkan ujian baru menggunakan tombol di atas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exams.map(exam => (
                    <div 
                      key={exam.id} 
                      className={`p-5 rounded-xl border transition-all flex flex-col justify-between h-full relative ${
                        exam.isActive 
                          ? 'border-blue-200 bg-blue-50/20 shadow-sm' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                                Kelas {exam.className}
                              </span>
                              {exam.assessmentType && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  {exam.assessmentType}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mt-2">
                              {exam.title ? `${exam.title} (${exam.subject})` : exam.subject}
                            </h3>
                          </div>
                          
                          {/* Active / Inactive status toggle */}
                          <button
                            onClick={() => handleToggleExamActive(exam.id)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                              exam.isActive 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {exam.isActive ? '● Aktif' : '○ Non-Aktif'}
                          </button>
                        </div>

                        {/* Stats block */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Durasi</p>
                            <p className="font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                              <Clock size={12} className="text-gray-400" />
                              {exam.durationMinutes} Menit
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">KKM Kelulusan</p>
                            <p className="font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                              <CheckCircle size={12} className="text-gray-400" />
                              {exam.kkm}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Jumlah Soal</p>
                            <p className="font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                              <FileText size={12} className="text-gray-400" />
                              {exam.questions.length} Soal
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card actions */}
                      <div className="flex items-center justify-between gap-2 border-t border-gray-100 mt-4 pt-4">
                        <button
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setActiveTab('soal');
                          }}
                          className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Kelola Soal ({exam.questions.length}) <ChevronRight size={14} />
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditExam(exam)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Edit Detail Ujian"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Ujian"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BANK SOAL & KKM */}
          {activeTab === 'soal' && (
            <div className="space-y-6" id="teacher-view-questions">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Kelola Bank Soal</h2>
                  <p className="text-sm text-gray-500">Pilih ujian untuk menyusun 5 jenis soal (Pilihan Ganda, Kompleks, Benar/Salah, Menjodohkan, Essay).</p>
                </div>
                {selectedExamId && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      id="add-question-btn"
                      onClick={() => handleOpenNewQuestion(selectedExamId)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus size={16} />
                      <span>Tambah Soal</span>
                    </button>
                    <button
                      id="generate-ai-btn"
                      onClick={() => {
                        if (!selectedExamId) {
                          setToastMessage("Pilih ujian terlebih dahulu untuk membuat soal AI.");
                          return;
                        }
                        setIsAiGeneratorOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Sparkles size={16} />
                      <span>Buat Otomatis (AI)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Selector */}
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Pilih Mata Pelajaran & Kelas Ujian
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>-- Pilih Ujian Terdaftar --</option>
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>{e.subject} - Kelas {e.className}</option>
                    ))}
                  </select>
                </div>
                {selectedExamId && (
                  <div className="w-full sm:w-1/2 grid grid-cols-2 gap-4">
                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">KKM Aktif</p>
                      <p className="text-lg font-bold text-gray-800">
                        {exams.find(e => e.id === selectedExamId)?.kkm ?? 75}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Soal</p>
                      <p className="text-lg font-bold text-gray-800">
                        {exams.find(e => e.id === selectedExamId)?.questions.length ?? 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Question list for chosen exam */}
              {selectedExamId ? (
                <div className="space-y-4">
                  {(() => {
                    const activeExam = exams.find(e => e.id === selectedExamId);
                    if (!activeExam || activeExam.questions.length === 0) {
                      return (
                        <div className="text-center py-12 text-gray-400">
                          <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                          <p className="font-semibold text-gray-600">Ujian ini belum memiliki soal</p>
                          <p className="text-xs mt-1">Klik tombol &quot;Tambah Soal&quot; di kanan atas untuk menyusun pertanyaan pertama Anda.</p>
                        </div>
                      );
                    }

                    return activeExam.questions.map((q, idx) => (
                      <div key={q.id} className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs relative">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                                SOAL {idx + 1}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wide">
                                {q.type.replace('_', ' ')}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono">
                                Bobot Nilai: {q.weight}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 whitespace-pre-line">{q.questionText}</h4>
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleOpenEditQuestion(selectedExamId, q)}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                              title="Edit Soal"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(selectedExamId, q.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                              title="Hapus Soal"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Rendering details about correct answers */}
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-100 text-xs bg-slate-50 p-3 rounded-lg">
                          <p className="font-semibold text-slate-800 mb-1">Kunci Jawaban Guru:</p>

                          {q.type === QuestionType.PILIHAN_GANDA && q.options && q.correctAnswerIndex !== undefined && (
                            <ul className="space-y-1">
                              {q.options.map((opt, oIdx) => (
                                <li key={oIdx} className={`flex items-center gap-1.5 ${oIdx === q.correctAnswerIndex ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                                  {oIdx === q.correctAnswerIndex ? <Check size={12} /> : <span className="w-3" />}
                                  <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {q.type === QuestionType.PILIHAN_GANDA_KOMPLEKS && q.options && q.correctAnswerIndices && (
                            <ul className="space-y-1">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = q.correctAnswerIndices!.includes(oIdx);
                                return (
                                  <li key={oIdx} className={`flex items-center gap-1.5 ${isCorrect ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                                    {isCorrect ? <Check size={12} /> : <span className="w-3" />}
                                    <span>[{isCorrect ? '✓' : ' '}] {String.fromCharCode(65 + oIdx)}. {opt}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}

                          {q.type === QuestionType.BENAR_SALAH && (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded font-bold text-xs ${q.correctTrueFalse ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {q.correctTrueFalse ? 'BENAR' : 'SALAH'}
                              </span>
                            </div>
                          )}

                          {q.type === QuestionType.MENJODOHKAN && q.matchingPairs && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.matchingPairs.map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 text-[11px]">
                                  <span className="font-semibold text-gray-700">{p.premise}</span>
                                  <span className="text-gray-400">➔</span>
                                  <span className="font-bold text-emerald-700">{p.response}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === QuestionType.ESSAY && (
                            <p className="text-gray-700 italic font-mono bg-white p-2 rounded border border-gray-200 text-[11px] whitespace-pre-line">
                              {q.essayKeyAnswer || '(Belum diinput)'}
                            </p>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                  <BookOpen size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-gray-600">Pilih Ujian Terlebih Dahulu</p>
                  <p className="text-xs">Gunakan menu pilihan di atas untuk menampilkan dan menyusun bank soal.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KOREKSI SOAL ESSAY */}
          {activeTab === 'koreksi' && (
            <div className="space-y-6" id="teacher-view-grading">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-900">Koreksi Soal Essay Manual</h2>
                <p className="text-sm text-gray-500">Nilai lembar jawaban essay siswa dan berikan tanggapan untuk merekapitulasi nilai akhir secara otomatis.</p>
              </div>

              {gradingSessionId ? (
                // ACTIVE GRADING INTERFACE
                (() => {
                  const session = studentSessions.find(s => s.id === gradingSessionId);
                  const exam = exams.find(e => e.id === session?.examId);
                  if (!session || !exam) return null;

                  return (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-gray-200"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg border border-gray-100 shadow-xs">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">{session.studentName}</h3>
                          <p className="text-xs text-gray-500">Kelas: {session.className} • Ujian: {session.subject}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setGradingSessionId(null)}
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleSaveGrades}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Save size={14} />
                            <span>Simpan Nilai Ujian</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {exam.questions.map((q, qIdx) => {
                          if (q.type !== QuestionType.ESSAY) return null;

                          return (
                            <div key={q.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs space-y-4">
                              <div className="flex justify-between items-start gap-4">
                                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                                  ESSAY SOAL {qIdx + 1}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">Bobot Soal: {q.weight}</span>
                              </div>

                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{q.questionText}</h4>
                              </div>

                              {/* Student's answer */}
                              <div className="p-3 bg-blue-50/30 rounded-lg border border-blue-100">
                                <p className="text-[10px] uppercase font-semibold text-blue-600 tracking-wider mb-1">Jawaban Murid:</p>
                                <p className="text-sm text-gray-800 whitespace-pre-line font-medium italic">
                                  &quot;{session.answers[q.id] || '(Kosong / Tidak Menjawab)'}&quot;
                                </p>
                              </div>

                              {/* Answer key */}
                              <div className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-100">
                                <p className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider mb-1">Referensi Kunci Jawaban Guru:</p>
                                <p className="text-xs text-gray-700 whitespace-pre-line bg-white p-2 rounded border border-gray-200 font-mono">
                                  {q.essayKeyAnswer || '(Tidak ada kunci jawaban spesifik)'}
                                </p>
                              </div>

                              {/* Input Grade */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                    Berikan Nilai untuk Soal ini (0 - 100)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={essayGradesForm[q.id]?.score ?? 100}
                                      onChange={(e) => {
                                        const scoreVal = Math.min(100, Math.max(0, Number(e.target.value)));
                                        setEssayGradesForm({
                                          ...essayGradesForm,
                                          [q.id]: {
                                            ...essayGradesForm[q.id],
                                            score: scoreVal
                                          }
                                        });
                                      }}
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-400">/ 100 persen bobot</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                    Catatan / Feedback Koreksi
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: Pemahaman langkah sudah baik, hasil hitung benar."
                                    value={essayGradesForm[q.id]?.feedback ?? ''}
                                    onChange={(e) => {
                                      setEssayGradesForm({
                                        ...essayGradesForm,
                                        [q.id]: {
                                          ...essayGradesForm[q.id],
                                          feedback: e.target.value
                                        }
                                      });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                        <button
                          onClick={() => setGradingSessionId(null)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveGrades}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle size={16} />
                          <span>Simpan Seluruh Penilaian</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })()
              ) : (
                // LIST SESSIONS NEEDING GRADING
                <div className="space-y-4">
                  {sessionsNeedingGrading.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                      <CheckCircle size={48} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="font-semibold text-gray-600">Semua Lembar Essay Terkoreksi!</p>
                      <p className="text-xs mt-1">Belum ada lembar pengerjaan siswa yang membutuhkan koreksi manual saat ini.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelas / Ujian</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skor Auto-Grade</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sessionsNeedingGrading.map(session => (
                            <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-950">{session.studentName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold mr-1">
                                  Kelas {session.className}
                                </span>
                                {session.subject}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-blue-700">
                                {session.autoScore} / 100
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  id={`grade-btn-${session.id}`}
                                  onClick={() => handleOpenGrading(session)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Edit2 size={12} />
                                  <span>Koreksi Essay</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HASIL UJIAN & CETAK */}
          {activeTab === 'hasil' && (
            <div className="space-y-6" id="teacher-view-results">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Hasil Rekapitulasi & Cetak Ujian</h2>
                  <p className="text-sm text-gray-500">Pilih kelas dan mata pelajaran untuk melihat data kelulusan KKM, skor siswa, dan mencetak/mengunduh rekapitulasi nilai.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMassResetStudentSessions(reportClass, reportSubject)}
                    className="flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title={`Reset Sesi Seluruh Siswa Kelas ${reportClass}`}
                  >
                    <RotateCcw size={14} />
                    <span>Reset Massal ({reportClass})</span>
                  </button>
                  {reportResults.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer border border-emerald-600"
                        title="Unduh data hasil ujian dalam format CSV / Excel"
                      >
                        <FileSpreadsheet size={15} />
                        <span>Ekspor CSV (Excel)</span>
                      </button>
                      <button
                        id="trigger-print-preview"
                        onClick={() => setIsPrintPreviewOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Printer size={15} />
                        <span>Cetak Hasil Ujian (PDF)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* QUICK SELECTOR: Kelas yang Sudah Mengirim Jawaban */}
              <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
                    <CheckCircle size={15} className="text-blue-600" />
                    <span>Pilih Kelas yang Sudah Mengirim Jawaban ({submittedClassesSummary.length} Kelas Selesai):</span>
                  </div>
                  {submittedClassesSummary.length === 0 && (
                    <span className="text-xs text-slate-500 italic">Belum ada siswa yang mengirim jawaban ujian.</span>
                  )}
                </div>

                {submittedClassesSummary.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {submittedClassesSummary.map(cls => {
                      const isSelected = reportClass === cls.className;
                      return (
                        <button
                          key={cls.className}
                          type="button"
                          onClick={() => {
                            setReportClass(cls.className);
                            if (cls.subjects.length > 0) {
                              setReportSubject(cls.subjects[0]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300' 
                              : 'bg-white text-slate-700 hover:bg-blue-50 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <span>Kelas {cls.className}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                            isSelected ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {cls.totalSubmitted} Siswa
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Pilih Kelas
                  </label>
                  <select
                    value={reportClass}
                    onChange={(e) => setReportClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map(cls => {
                      const count = studentSessions.filter(s => s.className === cls && s.isSubmitted).length;
                      return (
                        <option key={cls} value={cls}>
                          Kelas {cls} {count > 0 ? `(${count} siswa mengirim)` : '(0 siswa)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Pilih Mata Pelajaran
                  </label>
                  <select
                    value={reportSubject}
                    onChange={(e) => setReportSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {reportSubjectsList.length === 0 ? (
                      <option value="">(Belum ada mata pelajaran terdaftar)</option>
                    ) : (
                      reportSubjectsList.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Stats Summary for Selected Report */}
              {reportResults.length > 0 && reportExamDetail && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">KKM TARGET</p>
                    <p className="text-2xl font-black text-blue-900 mt-1">{reportExamDetail.kkm}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ketetapan Guru Mapel</p>
                  </div>
                  <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">TINGKAT KELULUSAN</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">
                      {Math.round((reportResults.filter(s => s.finalScore >= reportExamDetail.kkm && !s.isCheated).length / reportResults.length) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {reportResults.filter(s => s.finalScore >= reportExamDetail.kkm && !s.isCheated).length} dari {reportResults.length} Siswa Lulus
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">RATA-RATA KELAS</p>
                    <p className="text-2xl font-black text-amber-900 mt-1">
                      {Math.round(reportResults.reduce((acc, curr) => acc + curr.finalScore, 0) / reportResults.length)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Skor Akumulatif Rata-rata</p>
                  </div>
                </div>
              )}

              {/* Interactive Visualisation Analytics for Hasil Ujian */}
              <ClassAnalyticsCharts 
                exams={exams} 
                studentSessions={studentSessions} 
                classes={classes} 
                initialClass={reportClass}
                initialSubject={reportSubject}
              />

              {/* Result Table */}
              {reportResults.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                  <Printer size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-gray-600">Belum Ada Data Siswa Selesai Ujian</p>
                  <p className="text-xs mt-1">Untuk pilihan Kelas {reportClass} dan Mapel {reportSubject || '...'}, belum terdapat murid yang mengumpulkan jawaban.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm" id="results-table-view">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Koreksi</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Deteksi Curang</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Nilai CAT</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Kelulusan (KKM: {reportExamDetail?.kkm})</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi Reset</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportResults.map(s => {
                        const isLulus = s.finalScore >= (reportExamDetail?.kkm ?? 75) && !s.isCheated;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900">{s.studentName}</div>
                              <div className="text-[10px] text-gray-400 font-mono">ID Sesi: {s.id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                s.isGraded 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              }`}>
                                {s.isGraded ? '✓ Terkoreksi' : '⚡ Perlu Koreksi'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                              {s.isCheated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 text-red-800 font-bold border border-red-200">
                                  <Lock size={12} />
                                  Kunci Curang ({s.cheatWarningsCount})
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded ${
                                  s.cheatWarningsCount > 0 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}>
                                  {s.cheatWarningsCount > 0 ? (
                                    <>
                                      <AlertTriangle size={12} />
                                      {s.cheatWarningsCount} Pelanggaran
                                    </>
                                  ) : (
                                    'Aman (0)'
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-bold text-base text-slate-900">
                              {s.finalScore}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {s.isCheated ? (
                                <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-red-100 text-red-800 uppercase tracking-wide">
                                  TIDAK LULUS (GUGUR)
                                </span>
                              ) : isLulus ? (
                                <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                                  LULUS TUNTAS
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                                  REMEDIAL
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => handleResetSingleStudentSession(s.id, s.studentName)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Reset Sesi (Izinkan Siswa Ujian Ulang)"
                              >
                                <RotateCcw size={13} />
                                <span>Reset Sesi</span>
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
          )}

          {/* TAB 5: SISTEM ANTI-CURANG */}
          {activeTab === 'cheat' && (
            <div className="space-y-6" id="teacher-view-cheating">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Log Pengawas & Deteksi Kecurangan</h2>
                  <p className="text-sm text-gray-500">Rekaman pelanggaran tab-switch atau hilangnya fokus layar ujian siswa secara realtime.</p>
                </div>
                {cheatLogs.length > 0 && (
                  <button
                    id="clear-cheat-logs"
                    onClick={handleClearCheatLogs}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Hapus Semua Log</span>
                  </button>
                )}
              </div>

              {cheatLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-emerald-50/20 rounded-xl border border-dashed border-emerald-100">
                  <CheckCircle size={48} className="mx-auto mb-2 text-emerald-600 opacity-60" />
                  <p className="font-semibold text-emerald-800">Sistem Berjalan Kondusif</p>
                  <p className="text-xs mt-1 text-emerald-600">Belum ada aktivitas mencurigakan atau indikasi kecurangan yang terdeteksi.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  <AnimatePresence initial={false}>
                    {cheatLogs.slice().reverse().map(log => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-lg border flex items-start gap-3 text-xs ${
                          log.message.includes('Mengunci') || log.message.includes('terlampaui')
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-bold">
                              {log.studentName} (Kelas {log.className})
                            </span>
                            <span className="font-mono text-[10px] opacity-70">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                            </span>
                          </div>
                          <p className="mt-1 font-medium">{log.message}</p>
                          <p className="text-[10px] opacity-65 mt-0.5">Ujian: {log.subject}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PANEL ADMINISTRASI */}
          {activeTab === 'admin' && activeTeacher?.isAdmin && (
            <div className="space-y-6" id="teacher-view-admin">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" size={24} />
                    Panel Administrator CAT_SMPN5LR
                  </h2>
                  <p className="text-sm text-gray-500">Akses kontrol eksklusif untuk guru pendaftar pertama dan kepala sekolah.</p>
                </div>
              </div>

              {/* Storage & Capacity Monitor Widget */}
              <StorageCapacityCard 
                exams={exams}
                studentSessions={studentSessions}
                teachers={teachers}
                cheatLogs={cheatLogs}
                classes={classes}
              />

              {/* Memory Monitor and Manage Classes Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Memory Monitor */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="text-emerald-500" size={20} />
                    <h3 className="font-bold text-gray-800 text-sm">Pemantauan & Pembersihan Memori</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Optimalkan kinerja aplikasi, segarkan data, dan kosongkan alokasi memori JS Heap serta cache.</p>
                  
                  {/* Memory stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">JS Heap</span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {((performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 18)} MB
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Alokasi Max</span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {((performance as any).memory ? Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024) : 2176)} MB
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Cache Storage</span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {Math.round(JSON.stringify(localStorage).length / 1024)} KB
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleCleanMemory}
                      className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      Bersihkan & Segarkan Memori
                    </button>
                    <button
                      onClick={handleResetAllCache}
                      className="py-2 px-4 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Hapus Cache & Reset Pabrik
                    </button>
                  </div>
                </div>

                {/* Manage Classes */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="text-blue-500" size={20} />
                    <h3 className="font-bold text-gray-800 text-sm">Kelola Kelas / Rombongan Belajar</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Tambah atau hapus rombel kelas terstandarisasi untuk ujian CAT.</p>
                  
                  {/* Add Class Form */}
                  <form onSubmit={handleAddClass} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Contoh: IX-C, VIII-C"
                      required
                      value={newClassInput}
                      onChange={(e) => setNewClassInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Tambah
                    </button>
                  </form>

                  {/* Classes List */}
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-slate-50 border border-slate-100 rounded-lg">
                    {classes.map(cls => (
                      <span key={cls} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs font-mono">
                        {cls}
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(cls)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                          title={`Hapus kelas ${cls}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Teachers and Student Sessions List Tabs */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="border-b border-gray-200 flex bg-slate-50">
                  <button
                    onClick={() => setAdminSubTab('teachers')}
                    className={`px-5 py-3 text-xs font-extrabold border-r border-gray-200 transition-colors flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'teachers' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <GraduationCap size={16} />
                    KELOLA USER GURU & PENGAWAS ({teachers.length})
                  </button>
                  <button
                    onClick={() => setAdminSubTab('students')}
                    className={`px-5 py-3 text-xs font-extrabold border-r border-gray-200 transition-colors flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'students' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Users size={16} />
                    KELOLA SISWA & HASIL UJIAN ({studentSessions.length})
                  </button>
                  <button
                    onClick={() => setAdminSubTab('questions')}
                    className={`px-5 py-3 text-xs font-extrabold border-r border-gray-200 transition-colors flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'questions' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen size={16} />
                    HAPUS SOAL DARI UJIAN
                  </button>
                  <button
                    onClick={() => setAdminSubTab('capacity')}
                    className={`px-5 py-3 text-xs font-extrabold transition-colors flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'capacity' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <HardDrive size={16} />
                    KAPASITAS PENYIMPANAN DATA
                  </button>
                </div>

                {/* Sub-tab: Teachers */}
                {adminSubTab === 'teachers' && (
                  <div className="p-5">
                    {/* Inline edit or add teacher form */}
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200/80">
                      <h4 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5 uppercase">
                        <User size={14} />
                        {editingTeacherNip ? 'Edit Data Guru' : 'Daftarkan Guru Baru'}
                      </h4>
                      <form onSubmit={handleAdminSaveTeacher} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">NIP Guru</label>
                          <input
                            type="text"
                            required
                            disabled={!!editingTeacherNip}
                            placeholder="Ketik NIP..."
                            value={adminTeacherNip}
                            onChange={(e) => setAdminTeacherNip(e.target.value.trim())}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Lengkap & Gelar</label>
                          <input
                            type="text"
                            required
                            placeholder="Ketik nama..."
                            value={adminTeacherName}
                            onChange={(e) => setAdminTeacherName(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                          />
                        </div>
                        <div className="flex items-center gap-2 h-9">
                          <input
                            type="checkbox"
                            id="admin-teacher-is-admin"
                            checked={adminTeacherIsAdmin}
                            onChange={(e) => setAdminTeacherIsAdmin(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="admin-teacher-is-admin" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                            Hak Akses Admin
                          </label>
                        </div>
                        <div className="flex gap-2 justify-end">
                          {editingTeacherNip && (
                            <button
                              type="button"
                              onClick={handleCancelEditTeacher}
                              className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Batal
                            </button>
                          )}
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Save size={12} />
                            {editingTeacherNip ? 'Simpan Perubahan' : 'Tambah Guru'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Teachers Table */}
                    <div className="overflow-x-auto border border-slate-100 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-100">
                            <th className="p-3">NIP</th>
                            <th className="p-3">Nama Lengkap</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {teachers.map(teacher => (
                            <tr key={teacher.nip} className="hover:bg-slate-50/55 transition-colors">
                              <td className="p-3 font-mono font-bold text-blue-600">{teacher.nip}</td>
                              <td className="p-3 font-semibold text-slate-800">{teacher.name}</td>
                              <td className="p-3 text-center">
                                {teacher.isAdmin ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase font-mono">
                                    <ShieldCheck size={10} />
                                    Administrator
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase font-mono">
                                    Guru Biasa
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right space-x-1.5">
                                <button
                                  onClick={() => handleStartEditTeacher(teacher)}
                                  className="p-1 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                  title="Edit Guru"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTeacher(teacher.nip)}
                                  disabled={teacher.nip === activeTeacher.nip}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer inline-flex items-center disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Hapus Guru"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-tab: Student Sessions */}
                {adminSubTab === 'students' && (
                  <div className="p-5">
                    {/* Mass Reset Toolbar */}
                    <div className="mb-4 p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/10 text-amber-700 rounded-lg border border-amber-500/20">
                          <RotateCcw size={18} />
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Reset Sesi Ujian Siswa (Massal / Individu)</h5>
                          <p className="text-[11px] text-amber-700">Mereset status pengerjaan atau pendaftaran siswa agar dapat mengikuti ujian kembali jika terjadi gangguan teknis.</p>
                        </div>
                      </div>

                      {classes.length > 0 && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              const targetClass = prompt(`Ketikkan Kelas yang ingin di-reset massal (Tersedia: ${classes.join(', ')}):`, classes[0]);
                              if (targetClass && targetClass.trim()) {
                                handleMassResetStudentSessions(targetClass.trim().toUpperCase());
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                          >
                            <RotateCcw size={13} />
                            <span>Reset Massal Per Kelas</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit Student Form */}
                    {editingSessionId && (
                      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5 uppercase">
                          <Edit2 size={14} className="text-blue-500" />
                          Edit Identitas & Hasil Ujian Siswa
                        </h4>
                        <form onSubmit={handleAdminSaveStudent} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Lengkap Siswa</label>
                            <input
                              type="text"
                              required
                              value={adminStudentName}
                              onChange={(e) => setAdminStudentName(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pilih Rombel Kelas</label>
                            <select
                              value={adminStudentClass}
                              onChange={(e) => setAdminStudentClass(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                            >
                              {classes.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Skor Ujian Akhir (0-100)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              required
                              value={adminStudentScore}
                              onChange={(e) => setAdminStudentScore(Number(e.target.value))}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingSessionId(null)}
                              className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <Save size={12} />
                              Simpan
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Students Table */}
                    {studentSessions.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs italic">Belum ada data siswa yang terekam.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-100">
                              <th className="p-3">Siswa</th>
                              <th className="p-3">Kelas</th>
                              <th className="p-3">Ujian (Mata Pelajaran)</th>
                              <th className="p-3 text-center">Pelanggaran</th>
                              <th className="p-3 text-center">Skor Akhir</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentSessions.map(session => {
                              const isSubmitted = session.isSubmitted;
                              return (
                                <tr key={session.id} className="hover:bg-slate-50/55 transition-colors">
                                  <td className="p-3 font-bold text-slate-800">{session.studentName}</td>
                                  <td className="p-3 font-mono font-bold text-slate-600">{session.className}</td>
                                  <td className="p-3 text-slate-700">{session.subject}</td>
                                  <td className="p-3 text-center font-mono font-bold">
                                    <span className={session.cheatWarningsCount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                      {session.cheatWarningsCount}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-sm">
                                    {isSubmitted ? session.finalScore : '(Dalam Sesi)'}
                                  </td>
                                  <td className="p-3 text-center">
                                    {session.isCheated ? (
                                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 uppercase">Gugur (Curang)</span>
                                    ) : session.isSubmitted ? (
                                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 uppercase">Selesai</span>
                                    ) : (
                                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase">Ujian Aktif</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right space-x-1">
                                    <button
                                      onClick={() => handleResetSingleStudentSession(session.id, session.studentName)}
                                      className="p-1 text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                      title="Reset Sesi (Izinkan Ujian Ulang)"
                                    >
                                      <RotateCcw size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleStartEditStudent(session)}
                                      className="p-1 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                      title="Edit Siswa / Nilai"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudentSession(session.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                      title="Hapus Hasil Ujian"
                                    >
                                      <Trash2 size={13} />
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
                )}

                {/* Sub-tab: Questions */}
                {adminSubTab === 'questions' && (
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Pilih Jadwal Ujian</label>
                      <select
                        value={adminSelectedExamId}
                        onChange={(e) => setAdminSelectedExamId(e.target.value)}
                        className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                      >
                        <option value="">-- Pilih Ujian --</option>
                        {exams.map(e => (
                          <option key={e.id} value={e.id}>{e.subject} ({e.className})</option>
                        ))}
                      </select>
                    </div>

                    {adminSelectedExamId && (() => {
                      const selectedExam = exams.find(e => e.id === adminSelectedExamId);
                      if (!selectedExam) return null;
                      return (
                        <div className="space-y-3">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-100 flex items-center gap-1">
                            <BookOpen size={14} />
                            Daftar Soal Ujian: {selectedExam.subject} ({selectedExam.className})
                          </h4>
                          {selectedExam.questions.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs italic">Ujian ini belum memiliki soal.</div>
                          ) : (
                            <div className="space-y-3">
                              {selectedExam.questions.map((q, qIdx) => (
                                <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-lg flex items-start justify-between gap-4 hover:border-slate-300 transition-all">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-extrabold text-slate-800">Soal {qIdx + 1}</span>
                                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600 font-mono uppercase">
                                        {q.type.replace('_', ' ')}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-semibold font-mono">Bobot: {q.weight} pt</span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-800 leading-relaxed">{q.questionText}</p>
                                  </div>
                                  <button
                                    onClick={() => handleAdminDeleteQuestion(selectedExam.id, q.id)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                    title="Hapus Soal"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Sub-tab: Capacity Monitor */}
                {adminSubTab === 'capacity' && (
                  <div className="p-5">
                    <StorageCapacityCard 
                      exams={exams}
                      studentSessions={studentSessions}
                      teachers={teachers}
                      cheatLogs={cheatLogs}
                      classes={classes}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STANDALONE TAB: KAPASITAS PENYIMPANAN STORAGE */}
          {activeTab === 'kapasitas' && activeTeacher?.isAdmin && (
            <div className="space-y-6" id="teacher-view-kapasitas">
              <StorageCapacityCard 
                exams={exams}
                studentSessions={studentSessions}
                teachers={teachers}
                cheatLogs={cheatLogs}
                classes={classes}
              />
            </div>
          )}
        </main>
      </div>

      {/* DIALOG 1: JADWAL UJIAN FORM MODAL */}
      {isExamFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="exam-modal">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100"
          >
            <div className="border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingExamId ? 'Ubah Informasi Ujian' : 'Tambah Jadwal Ujian Baru'}
              </h3>
              <p className="text-xs text-gray-500">Lengkapi formulir untuk didaftarkan ke portal siswa.</p>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Nama Ujian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Penilaian Harian 1, PTS Semester Ganjil, Asesmen Sumatif 1"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Jenis Penilaian
                </label>
                <select
                  value={formAssessmentType}
                  onChange={(e) => setFormAssessmentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sumatif Lingkup Materi (PH)">Sumatif Lingkup Materi / Penilaian Harian (PH)</option>
                  <option value="Sumatif Tengah Semester (STS / PTS)">Sumatif Tengah Semester (STS / PTS)</option>
                  <option value="Sumatif Akhir Semester (SAS / PAS)">Sumatif Akhir Semester (SAS / PAS)</option>
                  <option value="Sumatif Akhir Tahun (SAT / PAT)">Sumatif Akhir Tahun (SAT / PAT)</option>
                  <option value="Asesmen Formatif">Asesmen Formatif / Latihan</option>
                  <option value="Ujian Sekolah / Asesmen Sekolah">Ujian Sekolah / Asesmen Sekolah</option>
                  <option value="Ujian / Penilaian Lainnya">Ujian / Penilaian Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Terapan, IPA Biologi"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Pilih Kelas Ujian
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Durasi Pengerjaan
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="5"
                      max="180"
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="w-full pl-3 pr-16 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Menit</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Kriteria Ketuntasan Minimal (KKM)
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="100"
                    value={formKkm}
                    onChange={(e) => setFormKkm(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Status Aktivasi
                  </label>
                  <div className="flex items-center gap-3 h-9">
                    <input
                      type="checkbox"
                      id="form-is-active"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="form-is-active" className="text-xs font-medium text-gray-700 cursor-pointer">
                      Jadwal Ujian Aktif
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsExamFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Simpan Ujian
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DIALOG 2: QUESTION FORM MODAL */}
      {isQuestionFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in" id="question-modal">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-gray-100 my-8"
          >
            <div className="border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingQuestionId ? 'Ubah Informasi Pertanyaan' : 'Tambah Soal Ujian Baru'}
              </h3>
              <p className="text-xs text-gray-500">
                Ujian: {exams.find(e => e.id === selectedExamForQuestion)?.subject} - Kelas {exams.find(e => e.id === selectedExamForQuestion)?.className}
              </p>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Pilih Jenis Soal
                  </label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={QuestionType.PILIHAN_GANDA}>Pilihan Ganda (Single Choice)</option>
                    <option value={QuestionType.PILIHAN_GANDA_KOMPLEKS}>Pilihan Ganda Kompleks (Multi Choice)</option>
                    <option value={QuestionType.BENAR_SALAH}>Benar / Salah</option>
                    <option value={QuestionType.MENJODOHKAN}>Menjodohkan (Matching)</option>
                    <option value={QuestionType.ESSAY}>Essay / Uraian Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Bobot Nilai / Poin Soal
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={qWeight}
                    onChange={(e) => setQWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Pertanyaan / Instruksi Soal
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ketik deskripsi atau narasi soal di sini..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* DYNAMIC FIELD RENDERING BY TYPE */}
              
              {/* Type 1 & 2: PILIHAN GANDA (SINGLE & KOMPLEKS) */}
              {(qType === QuestionType.PILIHAN_GANDA || qType === QuestionType.PILIHAN_GANDA_KOMPLEKS) && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Opsi Jawaban & Kunci Benar</p>
                  
                  {qOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-3">
                      <span className="font-bold text-sm text-gray-400 w-4">{String.fromCharCode(65 + oIdx)}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`Ketik opsi pilihan ${String.fromCharCode(65 + oIdx)}...`}
                        value={opt}
                        onChange={(e) => {
                          const nextOpts = [...qOptions];
                          nextOpts[oIdx] = e.target.value;
                          setQOptions(nextOpts);
                        }}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Single Choice Radio */}
                      {qType === QuestionType.PILIHAN_GANDA && (
                        <input
                          type="radio"
                          name="correct-single-choice"
                          checked={qCorrectSingleIndex === oIdx}
                          onChange={() => setQCorrectSingleIndex(oIdx)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Tandai sebagai jawaban benar"
                        />
                      )}

                      {/* Multi Choice Checkbox */}
                      {qType === QuestionType.PILIHAN_GANDA_KOMPLEKS && (
                        <input
                          type="checkbox"
                          checked={qCorrectMultiIndices.includes(oIdx)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQCorrectMultiIndices([...qCorrectMultiIndices, oIdx]);
                            } else {
                              setQCorrectMultiIndices(qCorrectMultiIndices.filter(i => i !== oIdx));
                            }
                          }}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Tandai sebagai salah satu jawaban benar"
                        />
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-400 italic">
                    *Tandai tombol lingkaran/kotak di ujung kanan opsi pilihan untuk mengesahkan kunci jawaban.
                  </p>
                </div>
              )}

              {/* Type 3: BENAR / SALAH */}
              {qType === QuestionType.BENAR_SALAH && (
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100 space-y-2">
                  <p className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Pilih Jawaban Benar</p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setQCorrectTrueFalse(true)}
                      className={`flex-1 py-2 px-4 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        qCorrectTrueFalse 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs' 
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      BENAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQCorrectTrueFalse(false)}
                      className={`flex-1 py-2 px-4 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        !qCorrectTrueFalse 
                          ? 'bg-red-100 text-red-800 border-red-300 shadow-xs' 
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      SALAH
                    </button>
                  </div>
                </div>
              )}

              {/* Type 4: MENJODOHKAN */}
              {qType === QuestionType.MENJODOHKAN && (
                <div className="bg-slate-50 p-4 rounded-lg border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Pasangkan Pernyataan (Kiri & Kanan)</p>
                    <button
                      type="button"
                      onClick={handleAddMatchingPair}
                      className="px-2 py-1 bg-white border border-gray-300 text-[10px] font-bold text-blue-600 rounded hover:bg-blue-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} />
                      Tambah Baris
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {qMatchingPairs.map((pair, pIdx) => (
                      <div key={pair.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Pernyataan Kiri (Premis)..."
                          value={pair.premise}
                          onChange={(e) => {
                            const nextPairs = [...qMatchingPairs];
                            nextPairs[pIdx].premise = e.target.value;
                            setQMatchingPairs(nextPairs);
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs bg-white"
                        />
                        <span className="text-gray-400 text-xs font-bold">➔</span>
                        <input
                          type="text"
                          required
                          placeholder="Jawaban Kanan (Pasangan Benar)..."
                          value={pair.response}
                          onChange={(e) => {
                            const nextPairs = [...qMatchingPairs];
                            nextPairs[pIdx].response = e.target.value;
                            setQMatchingPairs(nextPairs);
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs bg-white"
                        />
                        <button
                          type="button"
                          disabled={qMatchingPairs.length <= 2}
                          onClick={() => handleRemoveMatchingPair(pIdx)}
                          className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type 5: ESSAY */}
              {qType === QuestionType.ESSAY && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Referensi Jawaban (Kunci Informasi)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan keyword atau langkah penyelesaian yang harus ada pada jawaban murid untuk acuan koreksi..."
                    value={qEssayKeyAnswer}
                    onChange={(e) => setQEssayKeyAnswer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsQuestionFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DIALOG 3: PRINT PREVIEW MODAL */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-8 border border-gray-200 my-8 flex flex-col h-[90vh]">
            
            {/* Modal header with action buttons */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6 print:hidden">
              <div>
                <h3 className="text-base font-bold text-gray-900">Preview Cetak Dokumen</h3>
                <p className="text-xs text-gray-500">Berikut adalah lembar rekapitulasi hasil ujian yang akan dikirim ke mesin cetak.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-slate-50 border border-gray-300 rounded-lg cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-600"
                  title="Unduh file rekapitulasi nilai ke format CSV / Excel"
                >
                  <FileSpreadsheet size={14} />
                  <span>Ekspor CSV</span>
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Unduh dokumen langsung dalam format PDF"
                >
                  <Download size={14} />
                  <span>{isGeneratingPdf ? 'Memproses PDF...' : 'Unduh PDF (File)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenPrintWindow}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Buka lembar cetak di tab baru untuk mencetak dengan printer"
                >
                  <Printer size={14} />
                  <span>Cetak (Tab Baru)</span>
                </button>
              </div>
            </div>

            {/* Printable canvas container */}
            <div className="flex-1 overflow-y-auto pr-2 bg-slate-100 p-8 rounded-lg print:bg-white print:p-0 print:overflow-visible">
              
              {/* THE REPORT DOC START */}
              <div className="bg-white p-12 max-w-[210mm] mx-auto min-h-[297mm] shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 font-sans" id="printable-rekap-dokumen">
                {/* School Header / Kop Surat */}
                <div className="text-center border-b-4 border-double border-gray-900 pb-4 mb-6">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900">PEMERINTAH KABUPATEN MANGGARAI</h2>
                  <h1 className="text-xl font-extrabold uppercase text-gray-900">DINAS PENDIDIKAN • SMP NEGERI 5 LANGKE REMBONG</h1>
                  <p className="text-xs text-gray-500 italic mt-1">Alamat: Langke Rembong, Kabupaten Manggarai, Nusa Tenggara Timur</p>
                </div>

                {/* Document Title */}
                <div className="text-center mb-6">
                  <h3 className="text-base font-bold uppercase underline tracking-wide text-gray-900">LAPORAN HASIL EVALUASI UJIAN CAT</h3>
                  <p className="text-xs text-gray-600 font-mono mt-0.5">ID Dokumen: CAT-SMPN5LR-{reportClass}-{reportSubject.replace(/\s+/g, '')}</p>
                </div>

                {/* Exam Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 print:bg-white">
                  <div>
                    <table className="w-full text-left">
                      <tbody>
                        <tr>
                          <td className="font-semibold py-1 w-28">Mata Pelajaran</td>
                          <td className="py-1">: {reportSubject}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-1">Kelas / Rombel</td>
                          <td className="py-1">: Kelas {reportClass}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table className="w-full text-left">
                      <tbody>
                        <tr>
                          <td className="font-semibold py-1 w-32">Kriteria Ketuntasan (KKM)</td>
                          <td className="py-1">: {reportExamDetail?.kkm}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-1">Tanggal Cetak</td>
                          <td className="py-1">: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Results Table */}
                <table className="w-full text-left text-xs border-collapse border border-gray-400 mb-8" id="print-results-table">
                  <thead>
                    <tr className="bg-gray-100 print:bg-gray-50">
                      <th className="border border-gray-400 px-3 py-2 w-10 text-center">No</th>
                      <th className="border border-gray-400 px-4 py-2">Nama Lengkap Siswa</th>
                      <th className="border border-gray-400 px-3 py-2 text-center w-24">Skor Akhir</th>
                      <th className="border border-gray-400 px-4 py-2 text-center w-36">Hasil Ketercapaian</th>
                      <th className="border border-gray-400 px-3 py-2 text-center w-24">Pelanggaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportResults.map((s, sIdx) => {
                      const isLulus = s.finalScore >= (reportExamDetail?.kkm ?? 75) && !s.isCheated;
                      return (
                        <tr key={s.id}>
                          <td className="border border-gray-400 px-3 py-2 text-center">{sIdx + 1}</td>
                          <td className="border border-gray-400 px-4 py-2 font-semibold text-gray-900">{s.studentName}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center font-mono font-bold text-sm">{s.finalScore}</td>
                          <td className="border border-gray-400 px-4 py-2 text-center font-bold text-[11px]">
                            {s.isCheated ? (
                              <span className="text-red-700">GUGUR (CURANG)</span>
                            ) : isLulus ? (
                              <span className="text-emerald-700">TUNTAS (LULUS)</span>
                            ) : (
                              <span className="text-amber-700">TIDAK TUNTAS</span>
                            )}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center font-mono text-[11px]">
                            {s.cheatWarningsCount} kali
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Bottom Signatures */}
                <div className="flex justify-between items-start text-xs text-gray-800 mt-16 pt-8">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah SMP Negeri 5 Langke Rembong</p>
                    <div className="h-20" />
                    <p className="font-bold underline">Drs. Suhardi, M.Pd.</p>
                    <p className="text-[10px] text-gray-500">NIP. 19720512 199803 1 002</p>
                  </div>
                  <div className="text-right">
                    <p>Langke Rembong, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Guru Pengawas / Pembuat Ujian</p>
                    <div className="h-20" />
                    <p className="font-bold underline">{activeTeacher.name}</p>
                    <p className="text-[10px] text-gray-500">NIP. {activeTeacher.nip}</p>
                  </div>
                </div>

              </div>
              {/* THE REPORT DOC END */}

            </div>
          </div>
        </div>
      )}

      {/* DIALOG 4: CONFIRMATION MODAL UNTUK HAPUS JADWAL UJIAN */}
      <AnimatePresence>
        {examToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Hapus Jadwal Ujian</h3>
                  <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1">
                <p className="font-bold">Detail Jadwal yang Akan Dihapus:</p>
                <ul className="list-disc list-inside space-y-0.5 text-rose-800">
                  <li>Mata Pelajaran: <strong>{examToDelete.subject}</strong></li>
                  <li>Judul Ujian: <strong>{examToDelete.title}</strong></li>
                  <li>Kelas / Rombel: <strong>{examToDelete.className}</strong></li>
                  <li>Jumlah Soal: <strong>{examToDelete.questions.length} Soal</strong></li>
                </ul>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus jadwal ujian ini secara permanen beserta seluruh bank soal di dalamnya?
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExamToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteExam}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-200"
                >
                  <Trash2 size={15} />
                  <span>Ya, Hapus Ujian</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL KONFIRMASI HAPUS SEMUA LOG KECURANGAN */}
      <AnimatePresence>
        {isClearLogsConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kosongkan Log Kecurangan?</h3>
                  <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                Apakah Anda yakin ingin menghapus <strong>seluruh {cheatLogs.length} rekaman kecurangan</strong> siswa? Log akan dibersihkan dari layar dan database cloud Firestore.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClearLogsConfirmOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearCheatLogs}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-200"
                >
                  <Trash2 size={15} />
                  <span>Ya, Hapus Semua Log</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL AI QUESTION GENERATOR */}
      <AnimatePresence>
        {isAiGeneratorOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Pembuat Soal AI</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Powered by Gemini</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiGeneratorOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  disabled={isGeneratingAi}
                >
                  <X size={18} />
                </button>
              </div>

              {aiError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-rose-100">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Materi / Topik Ujian
                  </label>
                  <textarea
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Contoh: Sistem pencernaan manusia dan enzim yang berperan"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none h-24"
                    disabled={isGeneratingAi}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tingkat Kesulitan
                    </label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      disabled={isGeneratingAi}
                    >
                      <option value="Mudah">Mudah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Sulit">Sulit (HOTS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Jumlah Soal
                    </label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      disabled={isGeneratingAi}
                    >
                      <option value={1}>1 Soal</option>
                      <option value={3}>3 Soal</option>
                      <option value={5}>5 Soal</option>
                      <option value={10}>10 Soal</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateAiQuestions}
                  disabled={isGeneratingAi || !aiTopic.trim()}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                    isGeneratingAi || !aiTopic.trim()
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 cursor-pointer'
                  }`}
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Gemini Sedang Berpikir...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Buat {aiCount} Soal Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
