import { useState } from "react";

export const ExamSettings: React.FC<{
    onSubmit: (settings: any) => void;
    onBack: () => void;
  }> = ({ onSubmit, onBack }) => {
    const [settings, setSettings] = useState({
      openQuestions: true,
      multipleChoice: true,
      singleChoice: true,
      questionsPerSection: 3
    });
  
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">הגדרות בחינה</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">סוגי שאלות</h3>
            <label className="flex items-center space-x-3 space-x-reverse">
              <input
                type="checkbox"
                checked={settings.openQuestions}
                onChange={e => setSettings(prev => ({ ...prev, openQuestions: e.target.checked }))}
                className="form-checkbox h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-gray-700">שאלות פתוחות</span>
            </label>
            <label className="flex items-center space-x-3 space-x-reverse">
              <input
                type="checkbox"
                checked={settings.multipleChoice}
                onChange={e => setSettings(prev => ({ ...prev, multipleChoice: e.target.checked }))}
                className="form-checkbox h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-gray-700">שאלות רב-ברירה</span>
            </label>
            <label className="flex items-center space-x-3 space-x-reverse">
              <input
                type="checkbox"
                checked={settings.singleChoice}
                onChange={e => setSettings(prev => ({ ...prev, singleChoice: e.target.checked }))}
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
                value={settings.questionsPerSection}
                onChange={e => setSettings(prev => ({ 
                  ...prev, 
                  questionsPerSection: Number(e.target.value)
                }))}
                className="form-input w-20 rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
              />
            </div>
          </div>
        </div>
  
        <div className="flex justify-end space-x-4">
          <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            חזור
          </button>
          <button 
            onClick={() => onSubmit(settings)} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            צור בחינה
          </button>
        </div>
      </div>
    );
  };