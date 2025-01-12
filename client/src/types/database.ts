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
  id: string;
  created_at: string;
  exam_id: string;
  user_id: string;
  answers: { [key: string]: string[] | string };
  score: number;
}