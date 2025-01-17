import { supabase } from '../lib/supabase';
import { Exam, Section, Question, Answer } from '../types/exam';

interface ExamSettings {
  openQuestions: boolean;
  multipleChoice: boolean;
  singleChoice: boolean;
  questionsPerSection: number;
}

interface ExamDetails {
  title: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  alias: string;
}

interface CreateExamParams {
  file: File;
  settings: ExamSettings;
  title: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  alias?: string;
}

export class ExamService {
  private static API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  static async createExam(params: CreateExamParams): Promise<string> {
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('options', JSON.stringify(params.settings));

      // Call create-exam endpoint
      const response = await fetch(`${this.API_URL}/api/create-exam`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create exam');
      }

      const { exam } = await response.json();

      // Save exam to Supabase
      const { data: savedExam, error: examError } = await supabase
        .from('exams')
        .insert({
          title: params.title,
          description: params.description,
          subject: params.subject,
          grade_level: params.grade_level,
          alias: params.alias || params.title,
          is_published: false,
          user_id: user.id,
          created_by: user.id
        })
        .select()
        .single();

      if (examError) throw examError;

      // Get the exam ID as string
      const examId = savedExam.id.toString();

      // Save sections and their questions
      for (const section of exam.sections) {
        const { data: savedSection, error: sectionError } = await supabase
          .from('sections')
          .insert({
            exam_id: savedExam.id,
            title: section.title,
            instructions: section.instructions,
            order_index: exam.sections.indexOf(section)
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Save questions for this section
        for (const question of section.questions) {
          const { data: savedQuestion, error: questionError } = await supabase
            .from('questions')
            .insert({
              section_id: savedSection.id,
              text: question.text,
              type: question.type,
              points: question.points,
              order_index: section.questions.indexOf(question)
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Save answers if they exist
          if (question.answers) {
            const answersToInsert = question.answers.map((answer: string, index: number) => ({
              question_id: savedQuestion.id,
              text: answer,
              is_correct: question.correctAnswers?.includes(answer),
              order_index: index
            }));

            const { error: answersError } = await supabase
              .from('answers')
              .insert(answersToInsert);

            if (answersError) throw answersError;
          }
        }
      }

      return examId;  // Return the string ID
    } catch (error) {
      console.error('Error in createExam:', error);
      throw error;
    }
  }

  static async generateAlias(content: string): Promise<string> {
    try {
      const response = await fetch(`${this.API_URL}/api/generate-alias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error('Failed to generate alias');
      }

      const { alias } = await response.json();
      return alias;
    } catch (error) {
      console.error('Error generating alias:', error);
      throw error;
    }
  }

  static async createExamFromFile(
    file: File,
    details: ExamDetails,
    settings: ExamSettings
  ): Promise<string> {
    try {
      // First, get the exam content from the AI service
      const formData = new FormData();
      formData.append('file', file);
      formData.append('settings', JSON.stringify(settings));
      formData.append('details', JSON.stringify(details));

      const response = await fetch(`${this.API_URL}/api/create-exam`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create exam content');
      }

      const examContent = await response.json();

      // Then save the exam to Supabase
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          title: details.title,
          description: details.description,
          subject: details.subject,
          grade_level: details.grade_level,
          is_published: false
        })
        .select()
        .single();

      if (examError) throw examError;

      // Save sections and questions
      for (const section of examContent.sections) {
        const { data: savedSection, error: sectionError } = await supabase
          .from('sections')
          .insert({
            exam_id: exam.id,
            title: section.title,
            instructions: section.instructions,
            order_index: section.order_index
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Save questions for this section
        for (const question of section.questions) {
          const { data: savedQuestion, error: questionError } = await supabase
            .from('questions')
            .insert({
              section_id: savedSection.id,
              text: question.text,
              type: question.type,
              points: question.points,
              order_index: question.order_index
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Save answers if they exist
          if (question.answers) {
            const answersToInsert = question.answers.map((answer: Answer, index: number) => ({
              question_id: savedQuestion.id,
              text: answer.text,
              is_correct: answer.is_correct,
              order_index: index
            }));

            const { error: answersError } = await supabase
              .from('answers')
              .insert(answersToInsert);

            if (answersError) throw answersError;
          }
        }
      }

      return exam.id;
    } catch (error) {
      console.error('Error in createExamFromFile:', error);
      throw error;
    }
  }

  static async getExamById(examId: string | number): Promise<Exam | null> {
    try {
      // Ensure examId is a string
      const id = typeof examId === 'object' ? null : String(examId);
      
      if (!id) {
        throw new Error('Invalid exam ID');
      }

      // Get basic exam info using eq instead of match
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)  // Use eq with the string ID
        .single();

      if (examError) throw examError;
      if (!exam) return null;

      // Get sections
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('exam_id', id)  // Use eq here as well
        .order('order_index');

      if (sectionsError) throw sectionsError;

      // Get questions and answers for each section
      const fullSections = await Promise.all(
        sections.map(async (section) => {
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('section_id', section.id)
            .order('order_index');

          if (questionsError) throw questionsError;

          const fullQuestions = await Promise.all(
            questions.map(async (question) => {
              const { data: answers, error: answersError } = await supabase
                .from('answers')
                .select('*')
                .eq('question_id', question.id)
                .order('order_index');

              if (answersError) throw answersError;

              return { ...question, answers };
            })
          );

          return { ...section, questions: fullQuestions };
        })
      );

      return { ...exam, sections: fullSections };
    } catch (error) {
      console.error('Error in getExamById:', error);
      return null;
    }
  }

  static async updateExam(examId: string, updates: Partial<Exam>): Promise<boolean> {
    try {
      // Update the exam details excluding sections
      const { sections, ...examUpdates } = updates;
      const { error: examError } = await supabase
        .from('exams')
        .update(examUpdates)
        .eq('id', examId);

      if (examError) throw examError;

      // Update sections if provided
      if (sections) {
        for (const section of sections) {
          const { id: sectionId, questions, ...sectionUpdates } = section;
          const { error: sectionError } = await supabase
            .from('sections')
            .update(sectionUpdates)
            .eq('id', sectionId);

          if (sectionError) throw sectionError;

          // Update questions within the section
          if (questions) {
            for (const question of questions) {
              const { id: questionId, answers, ...questionUpdates } = question;
              const { error: questionError } = await supabase
                .from('questions')
                .update(questionUpdates)
                .eq('id', questionId);

              if (questionError) throw questionError;

              // Update answers within the question
              if (answers) {
                for (const answer of answers) {
                  const { id: answerId, ...answerUpdates } = answer;
                  const { error: answerError } = await supabase
                    .from('answers')
                    .update(answerUpdates)
                    .eq('id', answerId);

                  if (answerError) throw answerError;
                }
              }
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error in updateExam:', error);
      return false;
    }
  }

  static async deleteExam(examId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error in deleteExam:', error);
      return false;
    }
  }

  static async getUserExams(userId: string): Promise<Exam[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getUserExams:', error);
      return [];
    }
  }

  static async evaluateAnswer(
    question: Question,
    answer: string | string[]
  ): Promise<{
    score: number;
    feedback: string;
    correctAnswer?: string | string[];
  }> {
    try {
      if (!question.id || !question.type) {
        throw new Error('Invalid question data');
      }

      const requestBody = {
        question: {
          id: question.id,
          text: question.text,
          type: question.type,
          points: question.points
        },
        answer: answer
      };
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      console.log('Making request to:', `${apiUrl}/api/evaluate`);

      console.log('Request body:', requestBody);

      const response = await fetch(`${apiUrl}/api/evaluate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to evaluate answer');
        } catch (e) {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const result = await response.json();
      console.log('Evaluation result:', result);
      return result;
    } catch (error) {
      console.error('Error in evaluateAnswer:', error);
      throw error;
    }
  }
  static async publishExam(examId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: true })
        .eq('id', examId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error in publishExam:', error);
      return false;
    }
  }
}

export type {
  ExamSettings,
  ExamDetails,
  Exam,
  Section,
  Question,
  Answer
};