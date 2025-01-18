// src/components/exam/ExamTest.tsx
import React, { useState } from 'react';
import { Exam } from '../../types/exam';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

interface ExamTestProps {
  exam: Exam;
  onSubmit: (answers: Record<string, string | string[]>) => void;
}

export const ExamTest: React.FC<ExamTestProps> = ({ exam, onSubmit }) => {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const getHebrewLetter = (index: number) => {
    return String.fromCharCode(1488 + index); // א, ב, ג, etc.
  };

  const handleAnswer = (
    questionId: string,
    answer: string,
    type: 'single-choice' | 'multiple-choice' | 'open-ended',
    checked?: boolean
  ) => {
    console.log('Handling answer for question:', { questionId, answer, type, checked });
    
    if (type === 'open-ended') {
      setAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));
    } else if (type === 'multiple-choice') {
      const currentAnswers = Array.isArray(answers[questionId]) ? answers[questionId] as string[] : [];
      
      setAnswers(prev => ({
        ...prev,
        [questionId]: checked 
          ? [...currentAnswers, answer]
          : currentAnswers.filter(a => a !== answer)
      }));
    } else {
      setAnswers(prev => ({
        ...prev,
        [questionId]: [answer]
      }));
    }

    console.log('Updated answers:', answers);
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {exam.sections.map((section) => (
        <Card key={section.id} className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">{section.title}</h2>
            {section.instructions && (
              <p className="text-gray-600 mb-6">{section.instructions}</p>
            )}

            <div className="space-y-8">
              {section.questions.map((question, qIndex) => (
                <div key={question.id} className="border-b pb-6 last:border-b-0">
                  <div className="flex space-x-4 space-x-reverse mb-4">
                    <span className="font-medium">{qIndex + 1}.</span>
                    <div className="flex-1">
                      <p className="text-gray-800 mb-4">{question.text}</p>

                      {question.type === 'open-ended' ? (
                        <textarea
                          value={answers[question.id] as string || ''}
                          onChange={(e) => handleAnswer(question.id, e.target.value, 'open-ended')}
                          className="w-full border rounded-md p-2 min-h-[100px]"
                          placeholder="כתוב את תשובתך כאן..."
                        />
                      ) : (
                        <div className="space-y-2">
                          {question.answers?.map((answer, aIndex) => (
                            <label key={answer.id} className="flex items-center space-x-3 space-x-reverse">
                              <input
                                type={question.type === 'single-choice' ? 'radio' : 'checkbox'}
                                name={`question-${question.id}`}
                                checked={
                                  question.type === 'single-choice'
                                    ? answers[question.id]?.[0] === answer.text
                                    : (answers[question.id] as string[] || []).includes(answer.text)
                                }
                                onChange={(e) => handleAnswer(
                                  question.id,
                                  answer.text,
                                  question.type as 'single-choice' | 'multiple-choice',
                                  e.target.checked
                                )}
                                className={question.type === 'single-choice' ? 
                                  "form-radio h-5 w-5 text-blue-600 ml-2" : 
                                  "form-checkbox h-5 w-5 text-blue-600 rounded ml-2"
                                }
                              />
                              <span className="mr-2">{getHebrewLetter(aIndex)}.</span>
                              <span>{answer.text}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-6 flex justify-center">
        <Button 
          size="lg"
          onClick={() => setShowConfirmSubmit(true)}
          className="shadow-lg"
        >
          הגש מבחן
        </Button>
      </div>

      <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <AlertDialogContent dir="rtl" className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-auto">
          <AlertDialogHeader className="text-right space-y-3">
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              האם אתה בטוח שברצונך להגיש את המבחן?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              לאחר ההגשה לא ניתן יהיה לערוך את התשובות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex justify-start gap-3">
            <AlertDialogAction
              onClick={() => setShowConfirmSubmit(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              בטל
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmSubmit(false);
                handleSubmit();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              הגש מבחן
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExamTest;