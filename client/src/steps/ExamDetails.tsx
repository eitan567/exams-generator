export const ExamDetails: React.FC<{
    uploadedFile: File | null;
    onSubmit: (details: any) => void;
    onBack: () => void;
  }> = ({ uploadedFile, onSubmit, onBack }) => {
    // כאן יהיה הטופס של פרטי הבחינה שמתמלא אוטומטית מה-AI
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">פרטי הבחינה</h2>
        {/* תוכן הטופס */}
        <div className="flex justify-end space-x-4">
          <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            חזור
          </button>
          <button 
            onClick={() => onSubmit({})} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            המשך
          </button>
        </div>
      </div>
    );
  };