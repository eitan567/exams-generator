// src/components/exam/ExamEditor.tsx
import React, { useState } from 'react';
import { Exam, Question } from '../../types/exam';
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

  const handleQuestionUpdate = (
    sectionIndex: number,
    questionIndex: number,
    updatedQuestion: Question
  ) => {
    const updatedExam = { ...exam };
    updatedExam.sections[sectionIndex].questions[questionIndex] = updatedQuestion;
    setIsDirty(true);
    onExamUpdate(updatedExam);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await onExamUpdate(exam);
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

      {exam.sections.map((section, sectionIndex) => (
        <Card key={section.id} className="mb-8">
          <CardContent className="p-6">
            {/* Section header */}
            <div className="mb-6">
              <input
                type="text"
                value={section.title}
                onChange={(e) => {
                  const updatedExam = { ...exam };
                  updatedExam.sections[sectionIndex].title = e.target.value;
                  setIsDirty(true);
                  onExamUpdate(updatedExam);
                }}
                className="text-xl font-bold w-full border-0 focus:ring-2 focus:ring-blue-500 rounded p-1"
              />
              {section.instructions && (
                <textarea
                  value={section.instructions}
                  onChange={(e) => {
                    const updatedExam = { ...exam };
                    updatedExam.sections[sectionIndex].instructions = e.target.value;
                    setIsDirty(true);
                    onExamUpdate(updatedExam);
                  }}
                  className="mt-2 w-full border rounded p-2 text-gray-600"
                  rows={2}
                />
              )}
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {section.questions.map((question, questionIndex) => (
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
                          const updatedQuestion = { ...question, text: e.target.value };
                          handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
                        }}
                        className="w-full border rounded p-2"
                        rows={2}
                      />

                      {/* Answers if multiple choice or single choice */}
                      {question.answers && (
                        <div className="space-y-2 mr-6">
                          {question.answers.map((answer, answerIndex) => (
                            <div key={answerIndex} className="flex items-center space-x-2 space-x-reverse">
                              <span className="text-gray-600">
                                {String.fromCharCode(1488 + answerIndex)}.
                              </span>
                              <input
                                type="text"
                                value={answer.text}
                                onChange={(e) => {
                                  const updatedQuestion = { ...question };
                                  updatedQuestion.answers![answerIndex].text = e.target.value;
                                  handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
                                }}
                                className="flex-1 border rounded p-1"
                              />
                              <input
                                type={question.type === 'single-choice' ? 'radio' : 'checkbox'}
                                checked={answer.is_correct}
                                onChange={(e) => {
                                  const updatedQuestion = { ...question };
                                  updatedQuestion.answers![answerIndex].is_correct = e.target.checked;
                                  handleQuestionUpdate(sectionIndex, questionIndex, updatedQuestion);
                                }}
                                className={question.type === 'single-choice' ? 
                                  "form-radio h-5 w-5 text-blue-600 ml-2" : 
                                  "form-checkbox h-5 w-5 text-blue-600 rounded ml-2"
                                }
                              />
                            </div>
                          ))}
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExamEditor;