import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Progress } from "../ui/progress";
import { Loader2 } from "lucide-react";
import { ExamService } from '../../services/examService';

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCreated: (examId: string) => void;
}

interface ExamDetails {
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  alias: string;
}

interface ExamSettings {
  openQuestions: boolean;
  multipleChoice: boolean;
  singleChoice: boolean;
  questionsPerSection: number;
}

type QuestionTypeKey = Extract<keyof ExamSettings, 'openQuestions' | 'multipleChoice' | 'singleChoice'>;

const CreateExamModal: React.FC<CreateExamModalProps> = ({
  isOpen,
  onClose,
  onExamCreated
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails>({
    title: '',
    description: '',
    subject: '',
    grade_level: '',
    alias: ''
  });
  const [examSettings, setExamSettings] = useState<ExamSettings>({
    openQuestions: true,
    multipleChoice: true,
    singleChoice: true,
    questionsPerSection: 3
  });

  const questionTypes: QuestionTypeKey[] = ['openQuestions', 'multipleChoice', 'singleChoice'];

  const getQuestionTypeLabel = (type: QuestionTypeKey): string => {
    const labels: Record<QuestionTypeKey, string> = {
      openQuestions: 'שאלות פתוחות',
      multipleChoice: 'שאלות רב-ברירה',
      singleChoice: 'שאלות בחירה יחידה'
    };
    return labels[type];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const handleNextStep = async () => {
    if (step === 1 && file) {
      setLoading(true);
      try {
        // First API call - Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('options', JSON.stringify({
          questionTypes: examSettings,
          questionsPerSection: examSettings.questionsPerSection
        }));

        const uploadResponse = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/upload`, 
          {
            method: 'POST',
            body: formData
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        const { fileId } = await uploadResponse.json();
        if (!fileId) {
          throw new Error('No fileId received from upload');
        }

        // Second API call - Generate alias and metadata using fileId
        const generateResponse = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/generate-alias`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileId })
          }
        );

        if (!generateResponse.ok) {
          throw new Error('Failed to generate exam details');
        }

        const examData = await generateResponse.json();

        if (!examData || typeof examData.title === 'undefined' || typeof examData.description === 'undefined') {
          throw new Error('Invalid server response format');
        }

        setExamDetails(prev => ({
          ...prev,
          title: examData.title || '',
          description: examData.description || ''
        }));
        
        setStep(2);
      } catch (error) {
        console.error('Error:', error);
        // Here you might want to add error toast notification
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const canProceedToNext = () => {
    console.log('canProceedToNext:', step);
    switch (step) {
      case 1:
        return file !== null;
      case 2:
        return examDetails.title.trim() !== '';
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleCreateExam = async () => {
    if (!file || !examDetails.title) return;
    
    setLoading(true);
    try {
      const examId = await ExamService.createExam({
        file,
        settings: examSettings,
        title: examDetails.title,
        description: examDetails.description,
        subject: examDetails.subject,
        grade_level: examDetails.grade_level,
        alias: examDetails.alias
      });

      if (typeof examId === 'string') {
        onExamCreated(examId);
      } else {
        throw new Error('Invalid exam ID returned');
      }
    } catch (error) {
      console.error('Error creating exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">העלאת חומר בחינה</h2>
              <p className="text-gray-600 mt-2">העלה קובץ המכיל את חומר הבחינה</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-700">בחר קובץ</span>
                </label>
                {file && (
                  <div className="mt-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-md">
                    <span>קובץ נבחר: {file.name}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">גרור קבצי PDF, Word, או טקסט לכאן</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleNextStep}
                disabled={!canProceedToNext()}
                className={`px-6 py-2 rounded-md ${
                  canProceedToNext()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                הבא
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">פרטי הבחינה</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כותרת המבחן
                </label>
                <input
                  type="text"
                  value={examDetails.title}
                  onChange={(e) => setExamDetails(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תיאור
                </label>
                <textarea
                  value={examDetails.description}
                  onChange={(e) => setExamDetails(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  קודם
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!canProceedToNext()}
                  className={`px-6 py-2 rounded-md ${
                    canProceedToNext()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  הבא
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">הגדרות בחינה</h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">סוגי שאלות</h3>
                {questionTypes.map((type) => (
                  <label key={type} className="flex items-center space-x-3 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={examSettings[type]}
                      onChange={e => setExamSettings(prev => ({
                        ...prev,
                        [type]: e.target.checked
                      }))}
                    />
                    <span className="text-gray-700">
                      {getQuestionTypeLabel(type)}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-700">מספר שאלות</h3>
                <div className="flex items-center space-x-4 space-x-reverse mt-2">
                  <label className="text-gray-700">מספר שאלות בכל חלק:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={examSettings.questionsPerSection}
                    onChange={e => setExamSettings(prev => ({
                      ...prev,
                      questionsPerSection: Number(e.target.value)
                    }))}
                    className="w-20 p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                קודם
              </button>
              <button
                onClick={handleCreateExam}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                צור בחינה
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
      {/* Modal backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal content */}
      <div className="relative z-50 w-full max-w-md bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">יצירת מבחן חדש</h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="mt-4 text-lg text-gray-600">מעבד את הבקשה...</p>
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
};

export default CreateExamModal;