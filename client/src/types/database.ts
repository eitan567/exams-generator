// types/database.ts
import { ExamData } from '../types';

export interface ExamRecord {
  id: string;
  created_at: string;
  title: string;
  content: ExamData;
  created_by: string;
}

export interface ExamResult {
  questionId: string;
  score: number;
  feedback: string;
  correctAnswer?: string | string[];
  error?: boolean;
}

export interface ExamResults {
  [questionId: string]: ExamResult;
}