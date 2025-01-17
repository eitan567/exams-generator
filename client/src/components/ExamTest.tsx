import React, { useState } from 'react';
import { ExamData } from 'types';

interface ExamTestProps {
  examData: ExamData;
  onSwitchMode: () => void;
  onSubmit: (answers: { [key: string]: string[] | string }) => void;
}

const ExamTest = ({ examData, onSwitchMode, onSubmit }: ExamTestProps) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string[] | string }>({});

  const getHebrewLetter = (index: number) => {
    const hebrewLetters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];
    return hebrewLetters[index];
  };

  const handleAnswer = (
    questionId: string,
    answer: string,
    type: 'single-choice' | 'multiple-choice' | 'open-ended',
    checked?: boolean
  ) => {
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
        [questionId]: answer
      }));
    }

    console.log('Updated answers:', answers);
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    } else if (direction === 'next' && currentSectionIndex < examData.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    onSubmit(answers);
  };

  const currentSection = examData.sections[currentSectionIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{currentSection.title}</h2>
        {currentSection.instructions && (
          <p className="text-gray-600 mt-2">{currentSection.instructions}</p>
        )}
      </div>

      <div className="space-y-6">
        {currentSection.questions.map((question, qIndex) => (
          <div key={qIndex} className="p-4 bg-white rounded-lg shadow">
            <p className="mb-4">{question.text}</p>
            {question.answers ? (
              <div className="space-y-2">
                {question.answers.map((answer, aIndex) => (
                  <label key={aIndex} className="flex items-center space-x-3 space-x-reverse">
                    <div className="flex items-center min-w-[24px]">
                      <input
                        type={question.type === 'single-choice' ? "radio" : "checkbox"}
                        name={`question-${currentSectionIndex}-${qIndex}`}
                        value={answer.toString()}
                        onChange={(e) => handleAnswer(
                          `${currentSectionIndex}-${qIndex}`, 
                          e.target.value,
                          question.type,
                          e.target.checked
                        )}
                        checked={
                          Array.isArray(answers[`${currentSectionIndex}-${qIndex}`]) &&
                          (answers[`${currentSectionIndex}-${qIndex}`] as string[]).includes(answer.toString())
                        }
                        className={question.type === 'single-choice' ? 
                          "form-radio h-5 w-5 text-blue-600 ml-2" : 
                          "form-checkbox h-5 w-5 text-blue-600 rounded ml-2"
                        }
                      />
                    </div>
                    <span className="ml-2 text-gray-600">{getHebrewLetter(aIndex)}.</span>
                    <span className="flex-1">{answer.toString()}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full p-2 border rounded"
                rows={4}
                onChange={(e) => handleAnswer(   
                  question.id,              
                  e.target.value, 
                  'open-ended',
                  true
                )}
                value={
                  typeof answers[`${currentSectionIndex}-${qIndex}`] === 'string'
                    ? (answers[`${currentSectionIndex}-${qIndex}`] as string)
                    : ''
                }
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => handleNavigation('prev')}
          disabled={currentSectionIndex === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          קודם
        </button>
        
        {currentSectionIndex === examData.sections.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            הגש מבחן
          </button>
        ) : (
          <button
            onClick={() => handleNavigation('next')}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            הבא
          </button>
        )}
      </div>
    </div>
  );
};

export default ExamTest;