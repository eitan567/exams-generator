// types/exam.ts
export interface ExamMedia {
  id: string;
  question_id: string;
  type: 'image' | 'svg' | 'graph' | 'video';
  url: string;
  alt_text?: string;
  created_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  text: string;
  is_correct?: boolean;
  order_index: number;
  created_at: string;
}

export interface Question {
  id: string;
  section_id: string;
  text: string;
  type: 'single-choice' | 'multiple-choice' | 'open-ended';
  points: number;
  order_index: number;
  created_at: string;
  answers?: Answer[];
  media?: ExamMedia[];
  correctAnswers?: string[]; // For storing correct answers
}

export interface Section {
  id: string;
  exam_id: string;
  title: string;
  instructions?: string;
  order_index: number;
  created_at: string;
  questions: Question[];
}

export interface Exam {
  id: string;
  title: string;
  alias: string;
  created_by: string;
  is_published: boolean;
  description?: string;
  subject?: string;
  grade_level?: string;
  created_at: string;
  updated_at: string;
  sections: Section[];
}