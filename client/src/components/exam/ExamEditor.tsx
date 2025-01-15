// src/components/exam/ExamEditor.tsx
import React, { useState } from 'react';
import { Exam, Question, Answer } from '../../types/exam';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

interface ExamEditorProps {
  exam: Exam;
  onExamUpdate: (updatedExam: Exam) => void;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({ exam, onExamUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [localExam, setLocalExam] = useState<Exam>(exam);
  const [changedQuestions, setChangedQuestions] = useState<Set<string>>(new Set());

  const handleQuestionUpdate = (
    sectionIndex: number,
    questionIndex: number,
    updatedQuestion: Question
  ) => {
    const updatedExam = { ...localExam };
    updatedExam.sections[sectionIndex].questions[questionIndex] = updatedQuestion;
    setIsDirty(true);
    setLocalExam(updatedExam);
    setChangedQuestions((prev) => new Set(prev).add(updatedQuestion.id));
  };

  const handleAddQuestion = (sectionIndex: number) => {
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      section_id: localExam.sections[sectionIndex].id,
      text: '',
      type: 'single-choice',
      points: 0,
      order_index: localExam.sections[sectionIndex].questions.length,
      created_at: new Date().toISOString(),
      answers: Array.from({ length: 4 }, (_, index) => ({
        id: `new-answer-${Date.now()}-${index}`,
        question_id: `new-${Date.now()}`,
        text: '',
        is_correct: false,
        order_index: index,
        created_at: new Date().toISOString(),
        is_ai_generated: false
      })),
      is_ai_generated: false
    };
    const updatedExam = { ...localExam };
    updatedExam.sections[sectionIndex].questions.push(newQuestion);
    setIsDirty(true);
    setLocalExam(updatedExam);
    setChangedQuestions((prev) => new Set(prev).add(newQuestion.id));
  };

  const handleAddAnswer = (sectionIndex: number, questionIndex: number) => {
    const newAnswer: Answer = {
      id: `new-${Date.now()}`,
      question_id: localExam.sections[sectionIndex].questions[questionIndex].id,
      text: '',
      is_correct: false,
      order_index: localExam.sections[sectionIndex].questions[questionIndex].answers?.length || 0,
      created_at: new Date().toISOString(),
      is_ai_generated: false
    };
    const updatedExam = { ...localExam };
    updatedExam.sections[sectionIndex].questions[questionIndex].answers!.push(newAnswer);
    setIsDirty(true);
    setLocalExam(updatedExam);
    setChangedQuestions((prev) => new Set(prev).add(localExam.sections[sectionIndex].questions[questionIndex].id));
  };

  const handleDeleteQuestion = (sectionIndex: number, questionIndex: number) => {
    const updatedExam = { ...localExam };
    updatedExam.sections[sectionIndex].questions.splice(questionIndex, 1);
    setIsDirty(true);
    setLocalExam(updatedExam);
  };

  const handleDeleteAnswer = (sectionIndex: number, questionIndex: number, answerIndex: number) => {
    const updatedExam = { ...localExam };
    updatedExam.sections[sectionIndex].questions[questionIndex].answers!.splice(answerIndex, 1);
    setIsDirty(true);
    setLocalExam(updatedExam);
    setChangedQuestions((prev) => new Set(prev).add(localExam.sections[sectionIndex].questions[questionIndex].id));
  };

  const handleAnswerChange = (
    sectionIndex: number,
    questionIndex: number,
    answerIndex: number,
    checked: boolean,
    type: 'single-choice' | 'multiple-choice' | 'open-ended'
  ) => {
    const updatedQuestion = { ...localExam.sections[sectionIndex].questions[questionIndex] };
    
    if (type === 'single-choice') {
      // For radio buttons, set all answers to false first, then set the selected one to true
      updatedQuestion.answers = updatedQuestion.answers!.map((ans, idx) => ({
        ...ans,
        is_correct: idx === answerIndex ? checked : false
      }));
    } else {
      // For checkboxes, just toggle the selected answer
      updatedQuestion.answers![answerIndex].is_correct = checked;
    }
    
    // Mark all answers as non-AI-generated since we're making manual changes
    updatedQuestion.answers = updatedQuestion.answers!.map(ans => ({
      ...ans,
      is_ai_generated: false
    }));
    
    handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await onExamUpdate(localExam);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Floating save button when changes are made */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-10">
          <Button 
            onClick={handleSaveChanges}
            disabled={saving}
            className="shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                שומר שינויים...
              </>
            ) : (
              'שמור שינויים'
            )}
          </Button>
        </div>
      )}

      {localExam.sections.map((section, sectionIndex) => (
        <Card key={section.id} className="mb-8">
          <CardContent className="p-6">
            {/* Section header */}
            <div className="mb-6">
              <input
                type="text"
                value={section.title}
                onChange={(e) => {
                  const updatedExam = { ...localExam };
                  updatedExam.sections[sectionIndex].title = e.target.value;
                  setIsDirty(true);
                  setLocalExam(updatedExam);
                }}
                className="text-xl font-bold w-full border-0 focus:ring-2 focus:ring-blue-500 rounded p-1"
              />
              {section.instructions && (
                <textarea
                  value={section.instructions}
                  onChange={(e) => {
                    const updatedExam = { ...localExam };
                    updatedExam.sections[sectionIndex].instructions = e.target.value;
                    setIsDirty(true);
                    setLocalExam(updatedExam);
                  }}
                  className="mt-2 w-full border rounded p-2 text-gray-600"
                  rows={2}
                />
              )}
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {section.questions.map((question, questionIndex) => {
                const isQuestionChanged = !question.is_ai_generated || question.text !== exam.sections[sectionIndex].questions[questionIndex].text;
                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4 space-x-reverse">
                      <span className="font-medium text-gray-700 ml-2">
                        {questionIndex + 1}.
                      </span>
                      <div className="flex-1 space-y-4">
                        {/* Question text */}
                        <textarea
                          value={question.text}
                          onChange={(e) => {
                            const updatedQuestion = { ...question, text: e.target.value, is_ai_generated: false };
                            handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
                          }}
                          className="w-full border rounded p-2"
                          rows={2}
                        />

                        {/* Answers if multiple choice or single choice */}
                        {question.answers && (
                          <div className="space-y-2 mr-6">
                            {question.answers.map((answer, answerIndex) => {
                              const isAnswerChanged = !answer.is_ai_generated || answer.text !== exam.sections[sectionIndex].questions[questionIndex].answers![answerIndex].text;
                              return (
                                <div key={answer.id} className="flex items-center space-x-2 space-x-reverse">
                                  <span className="text-gray-600">
                                    {String.fromCharCode(1488 + answerIndex)}.
                                  </span>
                                  <input
                                    type="text"
                                    value={answer.text}
                                    onChange={(e) => {
                                      const updatedQuestion = { ...question };
                                      updatedQuestion.answers![answerIndex].text = e.target.value;
                                      updatedQuestion.answers![answerIndex].is_ai_generated = false;
                                      handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
                                    }}
                                    className="flex-1 border rounded p-1"
                                  />
                                  <input
                                    type={question.type === 'single-choice' ? 'radio' : 'checkbox'}
                                    name={`question-${question.id}`}
                                    checked={answer.is_correct}
                                    onChange={(e) => handleAnswerChange(
                                      sectionIndex,
                                      questionIndex,
                                      answerIndex,
                                      e.target.checked,
                                      question.type
                                    )}
                                    disabled={!changedQuestions.has(question.id)}
                                    className={question.type === 'single-choice' ? 
                                      "form-radio h-5 w-5 text-blue-600 ml-2" : 
                                      "form-checkbox h-5 w-5 text-blue-600 rounded ml-2"
                                    }
                                  />
                                  <Button variant="destructive" onClick={() => handleDeleteAnswer(sectionIndex, questionIndex, answerIndex)}>
                                    מחק תשובה
                                  </Button>
                                </div>
                              );
                            })}
                            <Button onClick={() => handleAddAnswer(sectionIndex, questionIndex)}>
                              הוסף תשובה
                            </Button>
                          </div>
                        )}

                        {/* Points */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="text-sm text-gray-600">ניקוד:</span>
                          <input
                            type="number"
                            value={question.points}
                            onChange={(e) => {
                              const updatedQuestion = { ...question, points: Number(e.target.value) };
                              handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
                            }}
                            className="w-20 border rounded p-1"
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                      <Button variant="destructive" onClick={() => handleDeleteQuestion(sectionIndex, questionIndex)}>
                        מחק שאלה
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button onClick={() => handleAddQuestion(sectionIndex)}>
                הוסף שאלה
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExamEditor;