import React, { useState } from 'react';
import { ExamData } from 'types';

interface ExamEditorProps {
  examData: ExamData;
  onExamUpdate: (exam: ExamData) => void;
  onSwitchMode: () => void;
}

const ExamEditor = ({ examData, onExamUpdate, onSwitchMode }: ExamEditorProps) => {
  const [autoShuffle, setAutoShuffle] = useState({
    questions: false,
    answers: false
  });

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleShuffleSection = (sectionIndex: number) => {
    const newExam = { ...examData };
    newExam.sections[sectionIndex].questions = shuffleArray(newExam.sections[sectionIndex].questions);
    onExamUpdate(newExam);
  };

  const handleShuffleAnswers = (sectionIndex: number, questionIndex: number) => {
    const newExam = { ...examData };
    const question = newExam.sections[sectionIndex].questions[questionIndex];
    if (question.answers) {
      question.answers = shuffleArray(question.answers);
    }
    onExamUpdate(newExam);
  };

  const generateExamHtml = (examToPrint: ExamData): string => {
    let html = `<h1>${examToPrint.title}</h1>`;

    examToPrint.sections.forEach((section, sectionIndex) => {
      html += `<h2>חלק ${sectionIndex + 1}: ${section.title}</h2>`;
      html += `<p>${section.instructions || ''}</p>`;

      section.questions.forEach((question, questionIndex) => {
        html += `<div class="question">
          <p><strong>${questionIndex + 1}. </strong>${question.text}</p>`;

        if (question.answers) {
          html += '<ol style="list-style-type: lower-alpha">';
          question.answers.forEach(answer => {
            html += `<li>${answer}</li>`;
          });
          html += '</ol>';
        }

        html += '</div>';
      });
    });

    return html;
  };

  const handlePrint = () => {
    const examToPrint = { ...examData };
    
    if (autoShuffle.questions) {
      examToPrint.sections = examToPrint.sections.map(section => ({
        ...section,
        questions: shuffleArray(section.questions)
      }));
    }

    if (autoShuffle.answers) {
      examToPrint.sections = examToPrint.sections.map(section => ({
        ...section,
        questions: section.questions.map(q => ({
          ...q,
          answers: q.answers ? shuffleArray(q.answers) : undefined
        }))
      }));
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>מבחן</title>
            <style>
              @media print {
                .no-print { display: none; }
                @page { margin: 2cm; }
              }
              body { font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            ${generateExamHtml(examToPrint)}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="space-x-4 space-x-reverse">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={autoShuffle.questions}
              onChange={(e) => setAutoShuffle(prev => ({ ...prev, questions: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="mr-2">ערבוב שאלות אוטומטי</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={autoShuffle.answers}
              onChange={(e) => setAutoShuffle(prev => ({ ...prev, answers: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="mr-2">ערבוב תשובות אוטומטי</span>
          </label>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          הדפסה
        </button>
      </div>

      {examData.sections.map((section, sIndex) => (
        <div key={sIndex} className="border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{section.title}</h3>
            <button
              onClick={() => handleShuffleSection(sIndex)}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              ערבב שאלות
            </button>
          </div>

          {section.questions.map((question, qIndex) => (
            <div key={qIndex} className="mb-6 last:mb-0">
              <div className="flex items-start mb-2">
                <span className="ml-2">{qIndex + 1}.</span>
                <textarea
                  value={question.text}
                  onChange={(e) => {
                    const newExam = { ...examData };
                    newExam.sections[sIndex].questions[qIndex].text = e.target.value;
                    onExamUpdate(newExam);
                  }}
                  className="flex-1 p-2 border rounded"
                  rows={2}
                />
              </div>

              {question.answers && (
                <div className="mr-8 space-y-2">
                  {question.answers.map((answer, aIndex) => (
                    <div key={aIndex} className="flex items-center">
                      <span className="ml-2">{String.fromCharCode(1488 + aIndex)}.</span>
                      <input
                        type="text"
                        value={answer.text}
                        onChange={(e) => {
                          const newExam = { ...examData };
                          newExam.sections[sIndex].questions[qIndex].answers![aIndex].text = e.target.value;
                          onExamUpdate(newExam);
                        }}
                        className="flex-1 p-2 border rounded"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => handleShuffleAnswers(sIndex, qIndex)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >
                    ערבב תשובות
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ExamEditor;

