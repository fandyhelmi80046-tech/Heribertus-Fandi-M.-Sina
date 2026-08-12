/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum QuestionType {
  PILIHAN_GANDA = 'PILIHAN_GANDA',
  PILIHAN_GANDA_KOMPLEKS = 'PILIHAN_GANDA_KOMPLEKS',
  BENAR_SALAH = 'BENAR_SALAH',
  MENJODOHKAN = 'MENJODOHKAN',
  ESSAY = 'ESSAY'
}

export interface MatchingPair {
  id: string;
  premise: string; // Left side
  response: string; // Right side
}

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  // Fields for PILIHAN_GANDA & PILIHAN_GANDA_KOMPLEKS
  options?: string[];
  correctAnswerIndex?: number; // Single choice correct index
  correctAnswerIndices?: number[]; // Multiple choice correct indices
  // Fields for BENAR_SALAH
  correctTrueFalse?: boolean; // true = Benar, false = Salah
  // Fields for MENJODOHKAN
  matchingPairs?: MatchingPair[]; // Left and right pairs
  // Fields for ESSAY
  essayKeyAnswer?: string; // Reference for manual grading
  // Points weight (default to 10)
  weight: number;
}

export interface Exam {
  id: string;
  title?: string; // Nama Ujian (e.g. Penilaian Harian 1, PTS Semester Ganjil, Asesmen Sumatif 1)
  subject: string; // Mata Pelajaran (e.g., Matematika, IPA)
  assessmentType?: string; // Jenis Penilaian (e.g., Sumatif Lingkup Materi, STS, SAS)
  className: string; // Kelas (e.g., IX-A, IX-B)
  durationMinutes: number; // Durasi ujian
  kkm: number; // Kriteria Ketuntasan Minimal (e.g., 75)
  isActive: boolean; // Status jadwal ujian aktif
  questions: Question[];
  createdAt: string;
}

export interface StudentSession {
  id: string; // Typically generated as className + name
  studentName: string;
  className: string;
  examId: string;
  subject: string;
  startTime: string;
  endTime?: string;
  timeLeftSeconds: number;
  isSubmitted: boolean;
  isCheated: boolean; // Flagged as cheated
  cheatWarningsCount: number; // Current warning violations
  answers: {
    // For PILIHAN_GANDA: number (index)
    // For PILIHAN_GANDA_KOMPLEKS: number[] (indices)
    // For BENAR_SALAH: boolean
    // For MENJODOHKAN: { [pairId: string]: string } (maps premise ID to correct response string)
    // For ESSAY: string
    [questionId: string]: any;
  };
  doubtFlags: {
    [questionId: string]: boolean; // Question marked as "ragu-ragu"
  };
  // Grading details
  essayScores: {
    [questionId: string]: {
      score: number; // 0 to 100
      feedback?: string;
    };
  };
  autoScore: number; // Score from auto-graded questions (0-100 scale)
  finalScore: number; // Overall final score (0-100 scale)
  isGraded: boolean; // True if all essays are graded or if there are no essays
}

export interface Teacher {
  nip: string;
  name: string;
  isAdmin?: boolean;
}

export interface CheatLog {
  id: string;
  studentName: string;
  className: string;
  subject: string;
  timestamp: string;
  message: string;
}
