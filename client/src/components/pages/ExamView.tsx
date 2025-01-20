import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamService } from '../../services/examService';
import ExamEditor from '../exam/ExamEditor';
import ExamTest from '../exam/ExamTest';
import { ExamResults } from '../exam/ExamResults';
import { Exam,ExamResult } from '../../types/exam';
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../ui/use-toast";

const ExamView = () => {
  const params = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'edit' | 'test' | 'results'>('edit');
  const [examResults, setExamResults] = useState<ExamResult[] | null>(null);

  useEffect(() => {
    // Extract and validate examId
    const examId = params?.examId;
    if (!examId) {
      navigate('/');
      return;
    }

    // Ensure examId is a string before passing to loadExam
    loadExam(String(examId));
  }, []);

  const loadExam = async (id: string) => {
    setLoading(true);
    try {
      const examData = await ExamService.getExamById(id);
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
      const success = await ExamService.updateExam(params.examId!, updatedExam);
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
      if (!exam) {
        throw new Error('Exam data is not available');
      }

      // Create a map of all questions for easier lookup
      const questionsMap = new Map();
      exam.sections.forEach(section => {
        section.questions.forEach(question => {
          questionsMap.set(question.id, question);
        });
      });

      // Process each answer and get question details
      const evaluationPromises = Object.entries(answers).map(async ([questionId, answer]) => {
        const question = questionsMap.get(questionId);
        if (!question) {
          console.error('Question not found:', questionId);
          return null;
        }

        try {
          const result = await ExamService.evaluateAnswer(question, answer);
          return {
            answer,
            questionId,
            ...result
          } as ExamResult;
        } catch (error) {
          console.error(`Error evaluating question ${questionId}:`, error);
          return {
            answer,
            questionId,
            score: 0,
            feedback: 'Error evaluating answer',
            error: true
          } as ExamResult;
        }
      });

      const rawResults = await Promise.all(evaluationPromises);
      const results = rawResults.filter((result): result is ExamResult => result !== null);
      
      if (results.length === 0) {
        throw new Error('No answers could be evaluated');
      }

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
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
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