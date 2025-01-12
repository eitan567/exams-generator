import React, { useState, useEffect } from 'react';
import { ExamOptions, ExamData, ExamResults, EvaluationResult } from './types';
import { Question, Section, Exam } from './types/exam';
import { ExamEditor, ExamTest, Login } from './components';
import ExamList from './components/ExamList';
import ExamMetadata from './components/ExamMetadata';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { ExamService } from './services/examService';
import Navbar from 'Navbar';
import CreateExam from './components/CreateExam';

export function App() {
  const { user } = useAuth();
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [options, setOptions] = useState<ExamOptions>({
    openQuestions: true,
    multipleChoice: true,
    singleChoice: true,
    questionsPerSection: 3
  });
  const [mode, setMode] = useState<'edit' | 'test' | 'results'>('edit');
  const [examResults, setExamResults] = useState<ExamResults | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({});
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (examData) {
      console.log('ExamData in render:', examData);
      console.log('Has sections:', !!examData.sections);
      console.log('Sections length:', examData.sections?.length);
    }
  }, [examData]);

  useEffect(() => {
    if (selectedExam?.id) {
      loadExamData(selectedExam.id);
    }
  }, [selectedExam]);

  const loadExamData = async (examId: string) => {
    setLoading(true);
    try {
      const exam = await ExamService.getExamById(examId);
      if (exam) {
        setExamData(exam);
        setError(null);
      } else {
        throw new Error('Failed to load exam data');
      }
    } catch (err) {
      console.error('Error loading exam:', err);
      setError('Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = (exam: Exam) => {
    setSelectedExam(exam);
    setMode('edit');
    setShowMetadata(false);
  };

  const handleNewExam = () => {
    setSelectedExam(null);
    setExamData(null);
    setShowMetadata(true);
    setMode('edit');
  };

  const handlePublishExam = async () => {
    if (!selectedExam) return;
    
    setLoading(true);
    try {
      const updatedExam = {
        ...selectedExam,
        is_published: true,
        sections: examData?.sections || []
      };
      
      const success = await ExamService.saveCompleteExam(updatedExam);
      if (success) {
        setSelectedExam(updatedExam);
      } else {
        throw new Error('Failed to publish exam');
      }
    } catch (err) {
      console.error('Error publishing exam:', err);
      setError('Failed to publish exam');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetadata = async (metadata: Partial<Exam>) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const examToSave = {
        ...metadata,
        created_by: user.id,
        sections: examData?.sections || [],
        is_published: false
      } as Exam;

      const success = await ExamService.saveCompleteExam(examToSave);
      if (success) {
        setShowMetadata(false);
        setSelectedExam(examToSave);
      } else {
        throw new Error('Failed to save exam');
      }
    } catch (err) {
      console.error('Error saving exam:', err);
      setError('Failed to save exam metadata');
    } finally {
      setLoading(false);
    }
  };

  // Your existing handler methods remain exactly the same
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setLoading(true);
    setError(null);
    setExamData(null);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('options', JSON.stringify(options));

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.sections) {
        throw new Error('Invalid response format from server');
      }

      console.log('Received data:', data);
      setExamData(data);
      setShowMetadata(true); // Show metadata form after successful upload
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing the file');
      setExamData(null);
    } finally {
      setLoading(false);
      setUploadProgress(100);
    }
  };

  // Keep your existing handleExamSubmit method exactly as is
  const handleExamSubmit = async (submittedAnswers: { [key: string]: string | string[] }) => {
    setLoading(true);
    setAnswers(submittedAnswers);
    
    try {
      const responses = await Promise.all(
        Object.entries(submittedAnswers).map(async ([questionId, answer]) => {
          const [sectionIndex, questionIndex] = questionId.split('-').map(Number);
          const question = examData!.sections[sectionIndex].questions[questionIndex];
          
          const answerString = Array.isArray(answer) ? answer.join(', ') : answer;
          
          const response = await fetch(`${API_URL}/api/evaluate`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              question, 
              answer: answerString 
            })
          });

          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }

          const result = await response.json();
          return { questionId, result };
        })
      );

      const results = responses.reduce((acc, { questionId, result }) => {
        acc[questionId] = result;
        return acc;
      }, {} as ExamResults);

      setExamResults(results);
      setMode('results');

      // Calculate final score
      let totalScore = 0;
      let totalPossiblePoints = 0;
      examData!.sections.forEach((section, sIndex) => {
        section.questions.forEach((question, qIndex) => {
          const questionId = `${sIndex}-${qIndex}`;
          const result = results[questionId];
          if (result) {
            totalScore += result.score * (question.points || 0) / 100;
            totalPossiblePoints += question.points || 0;
          }
        });
      });
      const finalScore = (totalScore / totalPossiblePoints * 100).toFixed(1);

      // Save results to Supabase
      if (selectedExam) {
        const { error } = await supabase
          .from('exam_results')
          .insert({
            exam_id: selectedExam.id,
            user_id: user?.id,
            answers: submittedAnswers,
            score: parseFloat(finalScore)
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to evaluate exam');
    } finally {
      setLoading(false);
    }
  };

  // Keep all your existing helper methods exactly as they are
  const handleModeSwitch = () => {
    if (mode === 'results') {
      setExamResults(null);
      setMode('edit');
    } else {
      setMode(mode === 'edit' ? 'test' : 'edit');
    }
  };

  const getHebrewLetter = (index: number) => {
    const hebrewLetters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];
    return hebrewLetters[index];
  };

  // Keep your existing formatStudentAnswer method exactly as is
  const formatStudentAnswer = (answer: string | string[], question: Question) => {
    if (Array.isArray(answer)) {
      return (
        <div className="space-y-1">
          {answer.map((ans) => {
            const originalIndex = question.answers?.findIndex(qAns => String(qAns) === String(ans)) ?? 0;
            return (
              <p key={originalIndex} className="text-gray-800">
                {getHebrewLetter(originalIndex)}. {ans}
              </p>
            );
          })}
        </div>
      );
    } else if (question.type === 'single-choice' && question.answers) {
      const originalIndex = question.answers.findIndex(ans => String(ans) === String(answer));
      return (
        <p className="text-gray-800">
          {originalIndex !== -1 ? `${getHebrewLetter(originalIndex)}. ${answer}` : answer}
        </p>
      );
    } else {
      return (
        <p className="text-gray-800 whitespace-pre-wrap">
          {answer}
        </p>
      );
    }
  };

  // Keep your existing renderCorrectAnswer method exactly as is
  const renderCorrectAnswer = (result: EvaluationResult, question: Question) => {
    if (!result.correctAnswer) return null;

    return (
      <div className="p-3 bg-green-50 rounded border border-green-200">
        <p className="font-medium text-green-700 mb-2">התשובה הנכונה:</p>
        {Array.isArray(result.correctAnswer) ? (
          <div className="space-y-1">
            {result.correctAnswer.map((answer) => {
              const originalIndex = question.answers?.findIndex(ans => String(ans) === String(answer)) ?? -1;
              return (
                <p key={originalIndex} className="text-green-600">
                  {originalIndex > -1 ? `${getHebrewLetter(originalIndex)}. ${answer}` : answer}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="text-green-600">
            {question.type === 'single-choice' && question.answers ? 
              `${getHebrewLetter(question.answers.findIndex(ans => String(ans) === String(result.correctAnswer)))}. ${result.correctAnswer}` :
              result.correctAnswer}
          </p>
        )}
      </div>
    );
  };

  // Keep your existing renderResults method exactly as is
  const renderResults = () => {
    if (!examResults || !examData) return null;

    let totalScore = 0;
    let totalPossiblePoints = 0;

    examData.sections.forEach((section, sIndex) => {
      section.questions.forEach((question, qIndex) => {
        const questionId = `${sIndex}-${qIndex}`;
        const result = examResults[questionId];
        if (result) {
          totalScore += result.score * (question.points || 0) / 100;
          totalPossiblePoints += question.points || 0;
        }
      });
    });

    const finalScore = (totalScore / totalPossiblePoints * 100).toFixed(1);

    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">תוצאות המבחן</h2>
          <div className="text-xl font-bold text-blue-600">
            ציון סופי: {finalScore}
          </div>
        </div>

        <div className="space-y-8">
          {examData.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">{section.title}</h3>
              
              <div className="space-y-6">
                {section.questions.map((question, questionIndex) => {
                  const questionId = `${sectionIndex}-${questionIndex}`;
                  const result = examResults[questionId];
                  
                  return (
                    <div key={questionIndex} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 mb-4">{question.text}</p>
                          
                          {/* Student's answer */}
                          <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                            <p className="font-medium text-gray-600 mb-2">התשובה שלך:</p>
                            {formatStudentAnswer(answers[questionId], question)}
                          </div>

                          {/* Feedback and score */}
                          {result && (
                            <>
                              <div className="mb-4 p-3 bg-gray-50">
                                <p><strong>משוב:</strong> {result.feedback}</p>
                              </div>
                              
                              {/* Correct answers */}
                              {renderCorrectAnswer(result, question)}
                            </>
                          )}
                        </div>
                        <span className="mr-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                          {result ? `${result.score}/100` : 'לא נבדק'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleModeSwitch}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            חזור למצב עריכה
          </button>
        </div>
      </div>
    );
  };
  
  const loadExams = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const exams = await ExamService.getUserExams(user.id);
      if (exams) {
        // The list will be automatically updated through ExamList component
        setError(null);
      } else {
        throw new Error('Failed to load exams');
      }
    } catch (err) {
      console.error('Error loading exams:', err);
      setError('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50" dir="rtl">
      <Navbar />
      <div className="p-6 pt-20"> {/* Added pt-20 to account for fixed navbar */}
        {!user ? null : (
          <div className="max-w-7xl mx-auto">
            <header className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">מערכת מבחנים</h1>
                  <p className="text-gray-600 mt-2">צור מבחנים מותאמים אישית בקלות</p>
                </div>
                
                <div className="flex items-center space-x-4 space-x-reverse">
                  {!selectedExam && !showMetadata && (
                    <button
                      onClick={handleNewExam}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      מבחן חדש
                    </button>
                  )}
                  
                  {selectedExam && (
                    <button
                      onClick={() => setSelectedExam(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      חזרה לרשימה
                    </button>
                  )}
                </div>
              </div>
            </header>

            <main className="space-y-8">
              {error && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="mr-3">
                      <p className="text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg">
                  <div className="flex items-center space-x-3">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-lg font-medium text-gray-700">
                      {mode === 'results' ? 'בודק את המבחן...' : 'מעבד...'}
                    </span>
                  </div>
                  {uploadProgress > 0 && mode !== 'results' && (
                    <div className="w-full mt-4">
                      <div className="bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Exam List Section */}
              {!selectedExam && !showMetadata && !loading && (
                  <>
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-xl font-semibold text-gray-800">המבחנים שלי</h2>
                      <button
                        onClick={handleNewExam}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        מבחן חדש
                      </button>
                    </div>
                    <ExamList onExamSelect={handleExamSelect} />
                  </>
                )}

                {showMetadata && (
                  <CreateExam
                    onCancel={() => {
                      setShowMetadata(false);
                      setExamData(null);
                    }}
                    onExamCreated={() => {
                      setShowMetadata(false);
                      loadExams(); // טעינה מחדש של רשימת המבחנים
                    }}
                  />
                )}
              {/* Exam Creation Section */}
              {mode === 'edit' && !selectedExam && !showMetadata && !examData && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-6">הגדרות מבחן</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-700 mb-3">סוגי שאלות</h3>
                      <label className="flex items-center space-x-3 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={options.openQuestions}
                          onChange={e => setOptions({...options, openQuestions: e.target.checked})}
                          className="form-checkbox h-5 w-5 text-blue-600 rounded"
                          disabled={loading}
                        />
                        <span className="text-gray-700">שאלות פתוחות</span>
                      </label>
                      <label className="flex items-center space-x-3 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={options.multipleChoice}
                          onChange={e => setOptions({...options, multipleChoice: e.target.checked})}
                          className="form-checkbox h-5 w-5 text-blue-600 rounded"
                          disabled={loading}
                        />
                        <span className="text-gray-700">שאלות רב-ברירה</span>
                      </label>
                      <label className="flex items-center space-x-3 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={options.singleChoice}
                          onChange={e => setOptions({...options, singleChoice: e.target.checked})}
                          className="form-checkbox h-5 w-5 text-blue-600 rounded"
                          disabled={loading}
                        />
                        <span className="text-gray-700">שאלות בחירה יחידה</span>
                      </label>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-700 mb-3">מספר שאלות</h3>
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <label className="text-gray-700">מספר שאלות בכל חלק:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={options.questionsPerSection}
                          onChange={e => setOptions({...options, questionsPerSection: Number(e.target.value)})}
                          className="form-input w-20 rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        disabled={loading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="mt-2 text-sm text-gray-500">PDF, Word, או קבצי טקסט</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Exam Editor/Test Section */}
              {selectedExam && examData && !loading && mode !== 'results' && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-800">{examData.title}</h2>
                      <p className="text-gray-600">{selectedExam.alias}</p>
                    </div>
                    
                    <div className="flex space-x-4 space-x-reverse">
                      {!selectedExam.is_published && (
                        <button
                          onClick={handlePublishExam}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          פרסם מבחן
                        </button>
                      )}
                      
                      <button
                        onClick={() => setShowMetadata(true)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        ערוך פרטים
                      </button>
                      
                      <button
                        onClick={handleModeSwitch}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        {mode === 'edit' ? 'מעבר למצב מבחן' : 'מעבר למצב עריכה'}
                      </button>
                    </div>
                  </div>

                  {mode === 'edit' ? (
                    <ExamEditor
                      examData={examData}
                      onExamUpdate={setExamData}
                      onSwitchMode={handleModeSwitch}
                    />
                  ) : (
                    <ExamTest
                      examData={examData}
                      onSwitchMode={handleModeSwitch}
                      onSubmit={handleExamSubmit}
                    />
                  )}
                </div>
              )}

              {/* Results Section */}
              {mode === 'results' && !loading && renderResults()}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;