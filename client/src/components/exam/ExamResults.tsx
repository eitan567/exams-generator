import React from 'react';
import { ExamResultsProps,ExamResult } from '../../types/exam';
import { Card, CardContent } from '../ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';

export const ExamResults: React.FC<ExamResultsProps> = ({ exam, results }) => {
  console.log("results :",results);
  // Calculate total score
  const calculateTotalScore = () => {
    let totalPoints = 0;
    let earnedPoints = 0;

    exam.sections.forEach(section => {
      section.questions.forEach(question => {
        const result = results.find(r => r.questionId === question.id);
        console.log("result :",result);
        if (result) {
          totalPoints += question.points;
          earnedPoints += (result.score / 100) * question.points;
        }
      });
    });

    return {
      totalPoints,
      earnedPoints,
      percentage: Math.round((earnedPoints / totalPoints) * 100)
    };
  };

  const { totalPoints, earnedPoints, percentage } = calculateTotalScore();

  const getHebrewLetter = (index: number) => {
    return String.fromCharCode(1488 + index); // א, ב, ג, etc.
  };

  return (
    <div className="space-y-8">
      {/* Total Score Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ציון סופי</h2>
            <div className="text-4xl font-bold text-blue-600">
              {percentage}
            </div>
            <p className="text-gray-600 mt-2">
              {earnedPoints.toFixed(1)} מתוך {totalPoints} נקודות
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results by Section */}
      {exam.sections.map((section) => (
        <Card key={section.id} className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">{section.title}</h2>

            <div className="space-y-8">
              {section.questions.map((question, qIndex) => {
                const result = results.find(r => r.questionId === question.id);
                const correctAnswers = question.answers?.filter((ans: any) => ans.is_correct).map((ans: any) => ans.text);
                if (!result) return null;

                return (
                  <div key={question.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex space-x-4 space-x-reverse flex-1">
                        <span className="font-medium">{qIndex + 1}.</span>
                        <div>
                          <p className="text-gray-800 mb-4">{question.text}</p>

                          {/* Student's Answer */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">התשובה שלך:</h4>
                            {question.type === 'open-ended' ? (
                              <p className="text-gray-800 whitespace-pre-wrap p-3 bg-gray-50 rounded">
                                {result.answer as string}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {Array.isArray(result.answer) ? (result.answer.map((ans, index) => (
                                  <p key={index} className="flex items-center space-x-2 space-x-reverse">
                                    <span>{getHebrewLetter(index)}.</span>
                                    <span>{ans}</span>
                                  </p>
                                ))) : (
                                  <p className="flex items-center space-x-2 space-x-reverse">                                    
                                    <span>{result.answer as string}</span>
                                  </p>                                  
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Correct Answer */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">התשובה הנכונה:</h4>
                            <div className="space-y-1">
                              {Array.isArray(correctAnswers) ? (correctAnswers.map((ans, index) => (
                                <p key={index} className="flex items-center space-x-2 space-x-reverse">
                                  <span>{getHebrewLetter(index)}.</span>
                                  <span>{ans}</span>
                                </p>
                              ))) : (
                                <p className="flex items-center space-x-2 space-x-reverse">
                                  <span>{correctAnswers}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Feedback */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">משוב:</h4>
                            <p className="text-gray-800">{result.feedback}</p>
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="ml-6 flex flex-col items-center">
                        <div className={`rounded-full w-12 h-12 flex items-center justify-center ${
                          result.score >= 60 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {result.score >= 60 ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600" />
                          )}
                        </div>
                        <span className="mt-2 font-medium">{result.score}/100</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExamResults;