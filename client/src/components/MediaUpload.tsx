import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { MediaService } from '../services/mediaService';

interface MediaUploadProps {
  examId: string;
  onUploadComplete: (url: string) => void;
  accept?: string;
}

export default function MediaUpload({ examId, onUploadComplete, accept = 'image/*,video/*' }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const url = await MediaService.uploadMedia(file, examId);
      if (!url) throw new Error('Upload failed');
      
      onUploadComplete(url);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      {error && (
        <div className="absolute top-0 right-0 left-0 -mt-6 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <label className={`
        flex items-center justify-center w-full h-32 
        border-2 border-dashed rounded-lg 
        cursor-pointer transition-colors
        ${uploading ? 'bg-gray-50 border-gray-300' : 'hover:bg-blue-50 border-blue-300'}
      `}>
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          disabled={uploading}
        />
        
        <div className="text-center">
          {uploading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <span className="text-sm text-gray-600">העלה קובץ</span>
            </>
          )}
        </div>
      </label>
    </div>
  );
}