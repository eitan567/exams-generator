// services/mediaService.ts
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export class MediaService {
  private static BUCKET_NAME = 'exam-media';

  static async uploadMedia(file: File, examId: string): Promise<string | null> {
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${examId}/${uuidv4()}.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  }

  static async deleteMedia(url: string): Promise<boolean> {
    try {
      // Extract the file path from the URL
      const path = url.split(`${this.BUCKET_NAME}/`)[1];
      
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      return false;
    }
  }
}