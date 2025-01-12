// services/examService.ts
import { supabase } from '../lib/supabase';
import { Exam, Section, Question, Answer, ExamMedia } from '../types/exam';

export class ExamService {
  private static API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Generate alias using backend API
  static async generateAlias(examContent: string): Promise<string> {
    try {
      const response = await fetch(`${this.API_URL}/api/generate-alias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: examContent })
      });

      if (!response.ok) {
        throw new Error('Failed to generate alias');
      }

      const data = await response.json();
      return data.alias || 'מבחן חדש';
    } catch (error) {
      console.error('Error generating alias:', error);
      return 'מבחן חדש';
    }
  }

  // Create new exam
  static async createExam(examData: Partial<Exam>): Promise<Exam | null> {
    const { data, error } = await supabase
      .from('exams')
      .insert([examData])
      .select()
      .single();

    if (error) {
      console.error('Error creating exam:', error);
      return null;
    }

    return data;
  }

  // Save complete exam with sections, questions, and answers
  static async saveCompleteExam(examData: Exam): Promise<boolean> {
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .upsert({
        id: examData.id,
        title: examData.title,
        alias: examData.alias,
        created_by: examData.created_by,
        is_published: examData.is_published,
        description: examData.description,
        subject: examData.subject,
        grade_level: examData.grade_level
      })
      .select()
      .single();

    if (examError) {
      console.error('Error saving exam:', examError);
      return false;
    }

    // Save sections
    for (const section of examData.sections) {
      const { error: sectionError } = await supabase
        .from('sections')
        .upsert({
          id: section.id,
          exam_id: exam.id,
          title: section.title,
          instructions: section.instructions,
          order_index: section.order_index
        });

      if (sectionError) {
        console.error('Error saving section:', sectionError);
        return false;
      }

      // Save questions
      for (const question of section.questions) {
        const { data: savedQuestion, error: questionError } = await supabase
          .from('questions')
          .upsert({
            id: question.id,
            section_id: section.id,
            text: question.text,
            type: question.type,
            points: question.points,
            order_index: question.order_index
          })
          .select()
          .single();

        if (questionError) {
          console.error('Error saving question:', questionError);
          return false;
        }

        // Save answers if they exist
        if (question.answers) {
          const { error: answersError } = await supabase
            .from('answers')
            .upsert(
              question.answers.map(answer => ({
                ...answer,
                question_id: savedQuestion.id
              }))
            );

          if (answersError) {
            console.error('Error saving answers:', answersError);
            return false;
          }
        }

        // Save media if they exist
        if (question.media) {
          const { error: mediaError } = await supabase
            .from('media')
            .upsert(
              question.media.map(media => ({
                ...media,
                question_id: savedQuestion.id
              }))
            );

          if (mediaError) {
            console.error('Error saving media:', mediaError);
            return false;
          }
        }
      }
    }

    return true;
  }

  // Get exam by ID
  static async getExamById(examId: string): Promise<Exam | null> {
    // Fetch exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examError) {
      console.error('Error fetching exam:', examError);
      return null;
    }

    // Fetch sections
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index');

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      return null;
    }

    // Fetch questions, answers, and media for each section
    const fullSections = await Promise.all(
      sections.map(async (section) => {
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('section_id', section.id)
          .order('order_index');

        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
          return section;
        }

        const fullQuestions = await Promise.all(
          questions.map(async (question) => {
            const [answersResult, mediaResult] = await Promise.all([
              supabase
                .from('answers')
                .select('*')
                .eq('question_id', question.id)
                .order('order_index'),
              supabase
                .from('media')
                .select('*')
                .eq('question_id', question.id)
            ]);

            return {
              ...question,
              answers: answersResult.data || [],
              media: mediaResult.data || []
            };
          })
        );

        return {
          ...section,
          questions: fullQuestions
        };
      })
    );

    return {
      ...exam,
      sections: fullSections
    };
  }

  // Get user exams
  static async getUserExams(userId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user exams:', error);
      return [];
    }

    return data;
  }

  // Delete exam
  static async deleteExam(examId: string): Promise<boolean> {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (error) {
      console.error('Error deleting exam:', error);
      return false;
    }

    return true;
  }

  // Update exam alias
  static async updateExamAlias(examId: string, newAlias: string): Promise<boolean> {
    const { error } = await supabase
      .from('exams')
      .update({ alias: newAlias })
      .eq('id', examId);

    if (error) {
      console.error('Error updating exam alias:', error);
      return false;
    }

    return true;
  }
}