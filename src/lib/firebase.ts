/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch
} from 'firebase/firestore';
import { Exam, StudentSession, Teacher, CheatLog } from '../types';

import firebaseAppletConfig from '../../firebase-applet-config.json';

// Web Firebase configuration
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: firebaseAppletConfig.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: firebaseAppletConfig.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: firebaseAppletConfig.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: firebaseAppletConfig.appId || metaEnv.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || "(default)"
};

let db: any = null;
let isFirebaseEnabled = false;

// Check if we have at least projectId to initialize
if (firebaseConfig.projectId && firebaseConfig.apiKey) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    isFirebaseEnabled = true;
    console.log("Firestore successfully initialized with database ID:", firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.warn("Firestore initialization failed. Running in Local Storage Mode.", error);
  }
} else {
  console.log("No Firebase config found. Running in Local Storage Mode with Firestore-ready interface.");
}

export { isFirebaseEnabled };

// Helper to check if a collection is empty and seed it
export async function dbGetExams(): Promise<Exam[] | null> {
  if (!isFirebaseEnabled) return null;
  try {
    const querySnapshot = await getDocs(collection(db, 'exams'));
    if (querySnapshot.empty) return [];
    const exams: Exam[] = [];
    querySnapshot.forEach((docSnap) => {
      exams.push(docSnap.data() as Exam);
    });
    return exams;
  } catch (error) {
    console.error("Firestore dbGetExams error, falling back:", error);
    return null;
  }
}

export async function dbSaveExams(exams: Exam[]): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    const querySnapshot = await getDocs(collection(db, 'exams'));
    const currentIds = new Set(exams.map(e => e.id));
    for (const docSnap of querySnapshot.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'exams', docSnap.id));
      }
    }
    for (const exam of exams) {
      const cleanExam = JSON.parse(JSON.stringify(exam));
      await setDoc(doc(db, 'exams', exam.id), cleanExam);
    }
    return true;
  } catch (error) {
    console.error("Firestore dbSaveExams error:", error);
    return false;
  }
}

export async function dbDeleteExam(examId: string): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    await deleteDoc(doc(db, 'exams', examId));
    return true;
  } catch (error) {
    console.error("Firestore dbDeleteExam error:", error);
    return false;
  }
}

export async function dbGetStudentSessions(): Promise<StudentSession[] | null> {
  if (!isFirebaseEnabled) return null;
  try {
    const querySnapshot = await getDocs(collection(db, 'studentSessions'));
    if (querySnapshot.empty) return null;
    const sessions: StudentSession[] = [];
    querySnapshot.forEach((docSnap) => {
      sessions.push(docSnap.data() as StudentSession);
    });
    return sessions;
  } catch (error) {
    console.error("Firestore dbGetStudentSessions error:", error);
    return null;
  }
}

export async function dbSaveStudentSessions(sessions: StudentSession[]): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    const querySnapshot = await getDocs(collection(db, 'studentSessions'));
    const currentIds = new Set(sessions.map(s => s.id));
    for (const docSnap of querySnapshot.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'studentSessions', docSnap.id));
      }
    }
    for (const session of sessions) {
      const cleanSession = JSON.parse(JSON.stringify(session));
      await setDoc(doc(db, 'studentSessions', session.id), cleanSession);
    }
    return true;
  } catch (error) {
    console.error("Firestore dbSaveStudentSessions error:", error);
    return false;
  }
}

export async function dbDeleteStudentSession(sessionId: string): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    await deleteDoc(doc(db, 'studentSessions', sessionId));
    return true;
  } catch (error) {
    console.error("Firestore dbDeleteStudentSession error:", error);
    return false;
  }
}

export async function dbGetTeachers(): Promise<Teacher[] | null> {
  if (!isFirebaseEnabled) return null;
  try {
    const querySnapshot = await getDocs(collection(db, 'teachers'));
    if (querySnapshot.empty) return null;
    const teachers: Teacher[] = [];
    querySnapshot.forEach((docSnap) => {
      teachers.push(docSnap.data() as Teacher);
    });
    return teachers;
  } catch (error) {
    console.error("Firestore dbGetTeachers error:", error);
    return null;
  }
}

export async function dbSaveTeachers(teachers: Teacher[]): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    const querySnapshot = await getDocs(collection(db, 'teachers'));
    const currentNips = new Set(teachers.map(t => t.nip));
    for (const docSnap of querySnapshot.docs) {
      if (!currentNips.has(docSnap.id)) {
        await deleteDoc(doc(db, 'teachers', docSnap.id));
      }
    }
    for (const teacher of teachers) {
      const cleanTeacher = JSON.parse(JSON.stringify(teacher));
      await setDoc(doc(db, 'teachers', teacher.nip), cleanTeacher);
    }
    return true;
  } catch (error) {
    console.error("Firestore dbSaveTeachers error:", error);
    return false;
  }
}

export async function dbDeleteTeacher(nip: string): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    await deleteDoc(doc(db, 'teachers', nip));
    return true;
  } catch (error) {
    console.error("Firestore dbDeleteTeacher error:", error);
    return false;
  }
}

export async function dbGetCheatLogs(): Promise<CheatLog[] | null> {
  if (!isFirebaseEnabled) return null;
  try {
    const querySnapshot = await getDocs(collection(db, 'cheatLogs'));
    if (querySnapshot.empty) return [];
    const logs: CheatLog[] = [];
    querySnapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as CheatLog);
    });
    return logs;
  } catch (error) {
    console.error("Firestore dbGetCheatLogs error:", error);
    return null;
  }
}

export async function dbSaveCheatLogs(logs: CheatLog[]): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    const querySnapshot = await getDocs(collection(db, 'cheatLogs'));
    const currentIds = new Set(logs.map(l => l.id));
    for (const docSnap of querySnapshot.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'cheatLogs', docSnap.id));
      }
    }
    for (const log of logs) {
      const cleanLog = JSON.parse(JSON.stringify(log));
      await setDoc(doc(db, 'cheatLogs', log.id), cleanLog);
    }
    return true;
  } catch (error) {
    console.error("Firestore dbSaveCheatLogs error:", error);
    return false;
  }
}

export async function dbClearCheatLogs(): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    const querySnapshot = await getDocs(collection(db, 'cheatLogs'));
    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(doc(db, 'cheatLogs', docSnap.id));
    }
    return true;
  } catch (error) {
    console.error("Firestore dbClearCheatLogs error:", error);
    return false;
  }
}

export async function dbGetClasses(): Promise<string[] | null> {
  if (!isFirebaseEnabled) return null;
  try {
    const querySnapshot = await getDocs(collection(db, 'classes'));
    if (querySnapshot.empty) return null;
    const classes: string[] = [];
    querySnapshot.forEach((docSnap) => {
      classes.push(docSnap.data().className);
    });
    return classes;
  } catch (error) {
    console.error("Firestore dbGetClasses error:", error);
    return null;
  }
}

export async function dbSaveClasses(classes: string[]): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    const querySnapshot = await getDocs(collection(db, 'classes'));
    const currentClasses = new Set(classes);
    for (const docSnap of querySnapshot.docs) {
      if (!currentClasses.has(docSnap.id)) {
        await deleteDoc(doc(db, 'classes', docSnap.id));
      }
    }
    for (const className of classes) {
      await setDoc(doc(db, 'classes', className), { className });
    }
    return true;
  } catch (error) {
    console.error("Firestore dbSaveClasses error:", error);
    return false;
  }
}

export async function dbDeleteClass(className: string): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    await deleteDoc(doc(db, 'classes', className));
    return true;
  } catch (error) {
    console.error("Firestore dbDeleteClass error:", error);
    return false;
  }
}

export async function dbClearAllData(): Promise<boolean> {
  if (!isFirebaseEnabled) return false;
  try {
    const collections = ['exams', 'studentSessions', 'teachers', 'cheatLogs', 'classes'];
    for (const colName of collections) {
      const querySnapshot = await getDocs(collection(db, colName));
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, colName, docSnap.id));
      }
    }
    return true;
  } catch (error) {
    console.error("Firestore dbClearAllData error:", error);
    return false;
  }
}
