import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamService } from '../../services/examService';
import ExamEditor from '../exam/ExamEditor';
import ExamTest from '../exam/ExamTest';
import { ExamResults } from '../exam/ExamResults';
import { Exam } from '../../types/exam';
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../ui/use-toast";

// Define the type for exam results
interface ExamResult {
  questionId: string;
  score: number;
  feedback: string;
  correctAnswer?: string | string[];
}

const ExamView = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'edit' | 'test' | 'results'>('edit');
  const [examResults, setExamResults] = useState<ExamResult[] | null>(null);

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    if (!examId) return;
    
    try {
      const examData = await ExamService.getExamById(examId);
      if (examData) {
        // Make sure the exam data has all required fields
        const completeExam: Exam = {
          ...examData,
          alias: examData.alias || examData.title, // Provide a default value if missing
        };
        setExam(completeExam);
      } else {
        toast({
          title: "שגיאה",
          description: "לא נמצא מבחן",
          variant: "destructive",
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המבחן",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExamUpdate = async (updatedExam: Exam) => {
    try {
      const success = await ExamService.updateExam(examId!, updatedExam);
      if (success) {
        setExam(updatedExam);
        toast({
          title: "המבחן עודכן",
          description: "השינויים נשמרו בהצלחה",
        });
      }
    } catch (error) {
      console.error('Error updating exam:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת השינויים",
        variant: "destructive",
      });
    }
  };

  const handleExamSubmit = async (answers: Record<string, string | string[]>) => {
    setLoading(true);
    try {
      // Evaluate each answer
      const results = await Promise.all(
        Object.entries(answers).map(async ([questionId, answer]) => {
          const result = await ExamService.evaluateAnswer(questionId, answer);
          return { questionId, ...result };
        })
      );

      setExamResults(results);
      setMode('results');
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בבדיקת המבחן",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{exam.title}</h1>
            {exam.description && (
              <p className="text-gray-600 mt-2">{exam.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            חזרה לרשימה
          </button>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="edit">עריכה</TabsTrigger>
          <TabsTrigger value="test">בחינה</TabsTrigger>
          <TabsTrigger value="results" disabled={!examResults}>
            תוצאות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <ExamEditor
            exam={exam}
            onExamUpdate={handleExamUpdate}
          />
        </TabsContent>

        <TabsContent value="test">
          <ExamTest
            exam={exam}
            onSubmit={handleExamSubmit}
          />
        </TabsContent>

        <TabsContent value="results">
          {examResults && (
            <ExamResults
              exam={exam}
              results={examResults}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExamView;