import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ExamService } from '../services/examService';
import { Exam } from '../types/exam';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ExamList({ onExamSelect }: { onExamSelect: (examId: string) => void }) {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
  }, [user]);

  const loadExams = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userExams = await ExamService.getUserExams(user.id);
      setExams(userExams);
      setError(null);
    } catch (err) {
      setError('Failed to load exams');
      console.error('Error loading exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מבחן זה?')) return;

    try {
      setDeleteInProgress(examId);
      console.log('Starting delete process for exam:', examId);

      // 1. Get all sections
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id')
        .eq('exam_id', examId);

      if (sectionsError) {
        throw new Error(`Failed to fetch sections: ${sectionsError.message}`);
      }

      console.log('Found sections:', sections);

      if (sections && sections.length > 0) {
        const sectionIds = sections.map(s => s.id);

        // 2. Get all questions
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('id')
          .in('section_id', sectionIds);

        if (questionsError) {
          throw new Error(`Failed to fetch questions: ${questionsError.message}`);
        }

        console.log('Found questions:', questions);

        if (questions && questions.length > 0) {
          const questionIds = questions.map(q => q.id);

          // 3. Delete answers
          const { error: answersError } = await supabase
            .from('answers')
            .delete()
            .in('question_id', questionIds);

          if (answersError) {
            throw new Error(`Failed to delete answers: ${answersError.message}`);
          }
          console.log('Deleted answers');

          // 4. Delete media
          const { error: mediaError } = await supabase
            .from('media')
            .delete()
            .in('question_id', questionIds);

          if (mediaError) {
            throw new Error(`Failed to delete media: ${mediaError.message}`);
          }
          console.log('Deleted media');

          // 5. Delete questions
          const { error: deleteQuestionsError } = await supabase
            .from('questions')
            .delete()
            .in('section_id', sectionIds);

          if (deleteQuestionsError) {
            throw new Error(`Failed to delete questions: ${deleteQuestionsError.message}`);
          }
          console.log('Deleted questions');
        }

        // 6. Delete sections
        const { error: deleteSectionsError } = await supabase
          .from('sections')
          .delete()
          .eq('exam_id', examId);

        if (deleteSectionsError) {
          throw new Error(`Failed to delete sections: ${deleteSectionsError.message}`);
        }
        console.log('Deleted sections');
      }

      // 7. Finally delete the exam
      const { error: deleteExamError } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)
        .single();

      if (deleteExamError) {
        throw new Error(`Failed to delete exam: ${deleteExamError.message}`);
      }
      console.log('Deleted exam successfully');

      // 8. Update local state
      setExams(prevExams => prevExams.filter(exam => exam.id !== examId));
      console.log('Updated local state');
      
    } catch (err) {
      console.error('Error in delete process:', err);
      alert('שגיאה במחיקת המבחן: ' + (err instanceof Error ? err.message : 'שגיאה לא ידועה'));
    } finally {
      setDeleteInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-r-4 border-red-500 p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">המבחנים שלי</h2>
      
      {exams.length === 0 ? (
        <p className="text-gray-500 text-center p-8">לא נמצאו מבחנים</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <div 
              key={exam.id} 
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{exam.title}</h3>
                  <p className="text-sm text-gray-600">{exam.alias}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  exam.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {exam.is_published ? 'פורסם' : 'טיוטה'}
                </span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  {new Date(exam.created_at).toLocaleDateString('he-IL')}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => onExamSelect(exam.id)} // שינוי כאן - העברת רק ה-ID
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                    title="ערוך מבחן"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(exam.id)}
                    disabled={deleteInProgress === exam.id}
                    className={`p-2 text-red-600 hover:bg-red-50 rounded-full ${
                      deleteInProgress === exam.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="מחק מבחן"
                  >
                    {deleteInProgress === exam.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-red-600 rounded-full border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => window.open(`/preview/${exam.id}`, '_blank')}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-full"
                    title="תצוגה מקדימה"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}