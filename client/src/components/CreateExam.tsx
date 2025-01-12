import React, { useState } from 'react';
import { ExamService } from '../services/examService';

interface CreateExamProps {
  onCancel: () => void;
  onExamCreated: () => void;
}

export const CreateExam: React.FC<CreateExamProps> = ({ onCancel, onExamCreated }) => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'details' | 'settings' | 'creating'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [examDetails, setExamDetails] = useState<any>(null);
  const [examSettings, setExamSettings] = useState({
    openQuestions: true,
    multipleChoice: true,
    singleChoice: true,
    questionsPerSection: 3
  });

  // File Upload Step
  const UploadStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">העלאת חומר לבחינה</h2>
      
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setUploadedFile(file);
              setCurrentStep('details');
            }
          }}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-2 text-sm text-gray-500">PDF, Word, או קבצי טקסט</p>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ביטול
        </button>
      </div>
    </div>
  );

  // Exam Details Step
  const DetailsStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">פרטי הבחינה</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            כותרת המבחן
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={examDetails?.title || ''}
            onChange={(e) => setExamDetails({ ...examDetails, title: e.target.value })}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            תיאור
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md"
            value={examDetails?.description || ''}
            onChange={(e) => setExamDetails({ ...examDetails, description: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => setCurrentStep('upload')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          חזור
        </button>
        <button
          onClick={() => setCurrentStep('settings')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          המשך
        </button>
      </div>
    </div>
  );

  // Exam Settings Step
  const SettingsStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">הגדרות בחינה</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">סוגי שאלות</h3>
          <label className="flex items-center space-x-3 space-x-reverse">
            <input
              type="checkbox"
              checked={examSettings.openQuestions}
              onChange={e => setExamSettings(prev => ({ ...prev, openQuestions: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-gray-700">שאלות פתוחות</span>
          </label>
          <label className="flex items-center space-x-3 space-x-reverse">
            <input
              type="checkbox"
              checked={examSettings.multipleChoice}
              onChange={e => setExamSettings(prev => ({ ...prev, multipleChoice: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-gray-700">שאלות רב-ברירה</span>
          </label>
          <label className="flex items-center space-x-3 space-x-reverse">
            <input
              type="checkbox"
              checked={examSettings.singleChoice}
              onChange={e => setExamSettings(prev => ({ ...prev, singleChoice: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-gray-700">שאלות בחירה יחידה</span>
          </label>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-700">מספר שאלות</h3>
          <div className="flex items-center space-x-4 space-x-reverse">
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
              className="form-input w-20 rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => setCurrentStep('details')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          חזור
        </button>
        <button
          onClick={async () => {
            setCurrentStep('creating');
            try {
              // כאן תהיה הקריאה ליצירת הבחינה
              await ExamService.createExam({
                ...examDetails,
                settings: examSettings,
                file: uploadedFile
              });
              onExamCreated();
            } catch (error) {
              console.error('Failed to create exam:', error);
              // Handle error
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          צור בחינה
        </button>
      </div>
    </div>
  );

  // Creation Progress Step
  const CreationStep = () => (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      <p className="mt-4 text-lg text-gray-600">יוצר את הבחינה...</p>
    </div>
  );

  // Progress Bar
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between">
        {['העלאת קובץ', 'פרטי בחינה', 'הגדרות'].map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${index < 2 ? 'flex-1' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === ['upload', 'details', 'settings'][index] || 
                ['upload', 'details', 'settings'].indexOf(currentStep) > index
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {index + 1}
            </div>
            {index < 2 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  ['upload', 'details', 'settings'].indexOf(currentStep) > index
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            )}
            <span className="absolute mt-16 text-sm font-medium text-gray-600">
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {currentStep !== 'creating' && <ProgressBar />}
      {currentStep === 'upload' && <UploadStep />}
      {currentStep === 'details' && <DetailsStep />}
      {currentStep === 'settings' && <SettingsStep />}
      {currentStep === 'creating' && <CreationStep />}
    </div>
  );
};

export default CreateExam;