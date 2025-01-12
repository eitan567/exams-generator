import React, { useState, useEffect } from 'react';
import { Exam } from '../types/exam';
import { ExamService } from '../services/examService';

interface ExamMetadataProps {
  exam: Partial<Exam>;
  onSave: (updatedExam: Partial<Exam>) => void;
  onCancel: () => void;
  examContent?: string; // Optional exam content for generating alias
}

export default function ExamMetadata({ exam, onSave, onCancel, examContent }: ExamMetadataProps) {
  const [formData, setFormData] = useState<Partial<Exam>>(exam);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateAlias = async () => {
    if (!examContent) return;
    
    setGenerating(true);
    try {
      const alias = await ExamService.generateAlias(examContent);
      setFormData(prev => ({
        ...prev,
        alias
      }));
    } catch (err) {
      setError('Failed to generate alias');
      console.error('Error generating alias:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.alias) {
      setError('נא למלא את כל השדות החובה');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">פרטי המבחן</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            כותרת המבחן *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            כינוי למבחן *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="alias"
              value={formData.alias || ''}
              onChange={handleChange}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
            {examContent && (
              <button
                type="button"
                onClick={generateAlias}
                disabled={generating}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {generating ? 'מייצר...' : 'ייצר אוטומטית'}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            תיאור
          </label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מקצוע
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שכבת גיל
            </label>
            <select
              name="grade_level"
              value={formData.grade_level || ''}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר שכבת גיל</option>
              <option value="elementary">יסודי</option>
              <option value="middle">חטיבת ביניים</option>
              <option value="high">תיכון</option>
              <option value="higher">השכלה גבוהה</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            שמור
          </button>
        </div>
      </form>
    </div>
  );
}