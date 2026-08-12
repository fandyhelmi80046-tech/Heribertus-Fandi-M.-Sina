/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, QuestionType, StudentSession, Teacher, CheatLog } from './types';

// Pre-registered teachers
export const INITIAL_TEACHERS: Teacher[] = [
  { nip: '19850524', name: 'Hendra Wijaya, S.Pd.' },
  { nip: '19920812', name: 'Riana Putri, M.Pd.' },
  { nip: '12345678', name: 'Drs. Heribertus Sina', isAdmin: true } // Standard easy testing account and Admin
];

// Active school classes
export const SCHOOL_CLASSES = [
  'VII-A', 'VII-B', 'VIII-A', 'VIII-B', 'IX-A', 'IX-B'
];

// Predefined exams with high quality content in Indonesian
export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-mat-ix',
    subject: 'Matematika Terapan',
    className: 'IX-A',
    durationMinutes: 45,
    kkm: 75,
    isActive: true,
    createdAt: '2026-07-15T08:00:00Z',
    questions: [
      {
        id: 'q1',
        type: QuestionType.PILIHAN_GANDA,
        questionText: 'Berapakah nilai x dari persamaan kuadrat x² - 5x + 6 = 0?',
        options: ['x = 1 atau x = 6', 'x = 2 atau x = 3', 'x = -2 atau x = -3', 'x = 0 atau x = 5'],
        correctAnswerIndex: 1,
        weight: 20
      },
      {
        id: 'q2',
        type: QuestionType.PILIHAN_GANDA_KOMPLEKS,
        questionText: 'Manakah dari pernyataan berikut yang BENAR mengenai bangun datar segitiga siku-siku? (Pilih semua yang benar)',
        options: [
          'Memiliki satu sudut sebesar 90 derajat.',
          'Kuadrat sisi miring sama dengan jumlah kuadrat sisi tegaknya (Teorema Pythagoras).',
          'Jumlah seluruh sudut dalamnya selalu 180 derajat.',
          'Selalu memiliki tiga sisi yang sama panjang.'
        ],
        correctAnswerIndices: [0, 1, 2],
        weight: 20
      },
      {
        id: 'q3',
        type: QuestionType.BENAR_SALAH,
        questionText: 'Volume sebuah tabung dengan jari-jari r dan tinggi t dirumuskan dengan V = πr²t. Apakah rumus ini benar?',
        correctTrueFalse: true,
        weight: 20
      },
      {
        id: 'q4',
        type: QuestionType.MENJODOHKAN,
        questionText: 'Jodohkanlah bangun ruang berikut dengan rumus luas permukaan yang tepat.',
        matchingPairs: [
          { id: 'm1', premise: 'Kubus (sisi s)', response: '6 * s²' },
          { id: 'm2', premise: 'Bola (jari-jari r)', response: '4 * π * r²' },
          { id: 'm3', premise: 'Tabung tanpa tutup (jari-jari r, tinggi t)', response: 'π * r * (r + 2t)' }
        ],
        weight: 20
      },
      {
        id: 'q5',
        type: QuestionType.ESSAY,
        questionText: 'Sebuah taman berbentuk lingkaran memiliki diameter 28 meter. Di sekeliling taman tersebut akan ditanami pohon dengan jarak antar pohon 4 meter. Jelaskan langkah-langkah dan hitunglah berapa banyak pohon yang dibutuhkan! (Gunakan π = 22/7)',
        essayKeyAnswer: 'Langkah 1: Hitung keliling lingkaran. K = π * d = (22/7) * 28 = 88 meter. Langkah 2: Hitung jumlah pohon dengan membagi keliling dengan jarak pohon. Jumlah pohon = Keliling / Jarak = 88 / 4 = 22 pohon. Jadi, pohon yang dibutuhkan sebanyak 22 pohon.',
        weight: 20
      }
    ]
  },
  {
    id: 'exam-ipa-viii',
    subject: 'Ilmu Pengetahuan Alam (Fisika & Biologi)',
    className: 'VIII-B',
    durationMinutes: 30,
    kkm: 70,
    isActive: true,
    createdAt: '2026-07-16T10:00:00Z',
    questions: [
      {
        id: 'ipa-q1',
        type: QuestionType.PILIHAN_GANDA,
        questionText: 'Organ tubuh manusia yang berfungsi untuk menyaring darah dan mengeluarkan sisa metabolisme dalam bentuk urine adalah...',
        options: ['Hati', 'Paru-paru', 'Ginjal', 'Jantung'],
        correctAnswerIndex: 2,
        weight: 25
      },
      {
        id: 'ipa-q2',
        type: QuestionType.BENAR_SALAH,
        questionText: 'Gaya gravitasi bumi menyebabkan semua benda yang memiliki massa saling tarik-menarik dan benda jatuh bebas menuju pusat bumi.',
        correctTrueFalse: true,
        weight: 25
      },
      {
        id: 'ipa-q3',
        type: QuestionType.MENJODOHKAN,
        questionText: 'Pasangkanlah organ tubuh pencernaan berikut dengan fungsinya yang sesuai.',
        matchingPairs: [
          { id: 'ipa-m1', premise: 'Lambung', response: 'Menghasilkan asam klorida (HCl) untuk membunuh kuman' },
          { id: 'ipa-m2', premise: 'Mulut', response: 'Pencernaan mekanik dengan gigi dan kimiawi dengan amilase' },
          { id: 'ipa-m3', premise: 'Usus Halus', response: 'Tempat utama penyerapan sari-sari makanan' }
        ],
        weight: 25
      },
      {
        id: 'ipa-q4',
        type: QuestionType.ESSAY,
        questionText: 'Sebutkan perbedaan utama antara sel tumbuhan dan sel hewan serta jelaskan fungsi organel dinding sel dan kloroplas!',
        essayKeyAnswer: 'Perbedaan utama: Sel tumbuhan memiliki dinding sel, kloroplas, dan vakuola berukuran besar, sedangkan sel hewan tidak memiliki dinding sel maupun kloroplas, serta vakuolanya kecil/tidak ada. Fungsi Dinding Sel: Melindungi sel, memberi bentuk kaku dan kokoh. Fungsi Kloroplas: Tempat berlangsungnya fotosintesis menghasilkan makanan bagi tumbuhan dengan bantuan energi matahari.',
        weight: 25
      }
    ]
  }
];

// Pre-filled completed student sessions for testing out results and manual grading
export const INITIAL_STUDENT_SESSIONS: StudentSession[] = [
  {
    id: 'session-budi-mat',
    studentName: 'Budi Setiawan',
    className: 'IX-A',
    examId: 'exam-mat-ix',
    subject: 'Matematika Terapan',
    startTime: '2026-07-18T07:10:00Z',
    endTime: '2026-07-18T07:45:00Z',
    timeLeftSeconds: 0,
    isSubmitted: true,
    isCheated: false,
    cheatWarningsCount: 1,
    answers: {
      'q1': 1, // Correct (x=2 atau x=3)
      'q2': [0, 1, 2], // Correct
      'q3': true, // Correct
      'q4': {
        'm1': '6 * s²', // Correct
        'm2': '4 * π * r²', // Correct
        'm3': 'π * r * (r + 2t)' // Correct
      },
      'q5': 'Pertama cari kelilingnya: K = 22/7 * 28 = 88m. Lalu dibagi jarak pohon 4m, jadi 88 / 4 = 22 pohon.' // Essay
    },
    doubtFlags: {},
    essayScores: {}, // Not graded yet (Teacher can grade this!)
    autoScore: 80, // 4 out of 5 questions correct (80 points)
    finalScore: 80, // Currently equal to autoScore before grading
    isGraded: false
  },
  {
    id: 'session-ani-mat',
    studentName: 'Ani Wijayanti',
    className: 'IX-A',
    examId: 'exam-mat-ix',
    subject: 'Matematika Terapan',
    startTime: '2026-07-18T07:05:00Z',
    endTime: '2026-07-18T07:35:00Z',
    timeLeftSeconds: 0,
    isSubmitted: true,
    isCheated: false,
    cheatWarningsCount: 0,
    answers: {
      'q1': 1, // Correct
      'q2': [0, 1], // Partially correct (missing option index 2), score: partial
      'q3': true, // Correct
      'q4': {
        'm1': '6 * s²',
        'm2': '4 * π * r²',
        'm3': 'π * r * (r + 2t)'
      },
      'q5': 'Keliling lingkaran = 22/7 * 28 = 88. Banyak pohon = 88/4 = 22 pohon. Langkahnya sangat mudah dan saya bisa mengerjakannya dengan tepat.'
    },
    doubtFlags: {},
    essayScores: {
      'q5': {
        score: 100,
        feedback: 'Jawaban dan penjelasan sangat lengkap dan tepat!'
      }
    },
    autoScore: 75, // Sample score
    finalScore: 85, // Fully graded, passed!
    isGraded: true
  },
  {
    id: 'session-rudi-mat',
    studentName: 'Rudi Tabuti',
    className: 'IX-A',
    examId: 'exam-mat-ix',
    subject: 'Matematika Terapan',
    startTime: '2026-07-18T07:12:00Z',
    endTime: '2026-07-18T07:30:00Z',
    timeLeftSeconds: 0,
    isSubmitted: true,
    isCheated: true, // Marked as cheated!
    cheatWarningsCount: 4, // Exceeded 3
    answers: {
      'q1': 0, // Incorrect
      'q2': [3], // Incorrect
      'q3': false // Incorrect
    },
    doubtFlags: {},
    essayScores: {
      'q5': {
        score: 0,
        feedback: 'Terdeteksi melakukan kecurangan (keluar tab) selama ujian berlangsung.'
      }
    },
    autoScore: 0,
    finalScore: 0,
    isGraded: true
  }
];

export const INITIAL_CHEAT_LOGS: CheatLog[] = [
  {
    id: 'cl-1',
    studentName: 'Rudi Tabuti',
    className: 'IX-A',
    subject: 'Matematika Terapan',
    timestamp: '2026-07-18T07:15:32Z',
    message: 'Meninggalkan layar ujian (Tab Switch) - Peringatan 1'
  },
  {
    id: 'cl-2',
    studentName: 'Rudi Tabuti',
    className: 'IX-A',
    subject: 'Matematika Terapan',
    timestamp: '2026-07-18T07:18:10Z',
    message: 'Meninggalkan layar ujian (Tab Switch) - Peringatan 2'
  },
  {
    id: 'cl-3',
    studentName: 'Rudi Tabuti',
    className: 'IX-A',
    subject: 'Matematika Terapan',
    timestamp: '2026-07-18T07:22:45Z',
    message: 'Meninggalkan layar ujian (Tab Switch) - Peringatan 3'
  },
  {
    id: 'cl-4',
    studentName: 'Rudi Tabuti',
    className: 'IX-A',
    subject: 'Matematika Terapan',
    timestamp: '2026-07-18T07:23:12Z',
    message: 'Sistem Mengunci Ujian Secara Otomatis karena batas kecurangan terlampaui!'
  },
  {
    id: 'cl-5',
    studentName: 'Budi Setiawan',
    className: 'IX-A',
    subject: 'Matematika Terapan',
    timestamp: '2026-07-18T07:30:02Z',
    message: 'Meninggalkan layar ujian (Tab Switch) - Peringatan 1'
  }
];
