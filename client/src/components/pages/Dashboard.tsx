// src/components/pages/Dashboard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExamList from '../ExamList';
import CreateExamModal from '../modals/CreateExamModal';
import { useToast } from "../../components/ui/use-toast";

const Dashboard = () => {
  const [showCreateExam, setShowCreateExam] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleExamCreated = (examId: string) => {
    setShowCreateExam(false);
    toast({
      title: "המבחן נוצר בהצלחה",
      description: "מועבר למסך עריכת המבחן",
    });
    navigate(`/exam/${examId}`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          מערכת מבחנים
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          צור מבחנים מותאמים אישית בקלות
        </p>
        <button
          onClick={() => setShowCreateExam(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          מבחן חדש
        </button>
      </div>

      {/* Exams List Section */}
      <section>
        <ExamList 
          onExamSelect={(examId) => navigate(`/exam/${examId}`)} 
        />
      </section>

      {/* Create Exam Modal */}
      {showCreateExam && (
        <CreateExamModal
          isOpen={showCreateExam}
          onClose={() => setShowCreateExam(false)}
          onExamCreated={handleExamCreated}
        />
      )}
    </div>
  );
};

export default Dashboard;