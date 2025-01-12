
export interface ExamOptions {
  openQuestions: boolean;
  multipleChoice: boolean;
  singleChoice: boolean;
  questionsPerSection: number;
}

export interface Question {
  text: string;
  type: 'open' | 'multiple' | 'single';
  answers?: string[];
  points?: number;  // Added optional points for the entire section
}

export interface Section {
  title: string;
  instructions?: string;  // Added optional instructions  
  questions: Question[];
}

export interface ExamData {
  title: string;
  sections: Section[];
}

export interface ExamOptions {
  openQuestions: boolean;
  multipleChoice: boolean;
  singleChoice: boolean;
  questionsPerSection: number;
}