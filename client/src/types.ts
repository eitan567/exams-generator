// types/types.ts
import { Section } from './types/exam';

export interface ExamOptions {
  openQuestions: boolean;
  multipleChoice: boolean;
  singleChoice: boolean;
  questionsPerSection: number;
}

export interface ExamData {
  id?: string;
  title: string;
  sections: Section[];
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  correctAnswer?: string | string[];
}

export interface ExamResults {
  [questionId: string]: EvaluationResult;
}

