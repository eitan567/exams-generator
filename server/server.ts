import express from 'express';
import multer from 'multer';
import { OpenAI } from 'openai';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import { parseOfficeAsync } from 'officeparser';  // Update import
import mammoth from 'mammoth';
import textract from 'textract';
import { promisify } from 'util';
import dotenv from 'dotenv';
dotenv.config();

interface Question {
  text: string;
  type: 'single-choice' | 'multiple-choice' | 'open-ended';
  answers?: string[];
  points?: number;
}

interface Section {
  title: string;
  instructions?: string;
  questions: Question[];
}

interface ExamData {
  title: string;
  sections: Section[];
}

interface ExamOptions {
  openQuestions: boolean;
  multipleChoice: boolean;
  singleChoice: boolean;
  questionsPerSection: number;
}

interface UploadedFile {
  id: string;
  filename: string;
  path: string;
  content?: string;
}
const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '<YOUR_SUPABASE_URL>',
  process.env.SUPABASE_ANON_KEY || '<YOUR_SUPABASE_ANON_KEY>'
);

// Update CORS configuration to allow multiple origins
// Update CORS configuration to allow multiple origins
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-ea87ad8a39d44e8ba36c928369358c4d'
});

function cleanJsonResponse(response: string): string {
  // Remove markdown code block syntax
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  // Remove any leading/trailing newlines
  cleaned = cleaned.replace(/^\n+/, '').replace(/\n+$/, '');
  return cleaned;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitTextIntoChunks(text: string, maxTokensPerChunk: number = 30000): string[] {
  const paragraphs = text.split('\n\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const potentialChunk = currentChunk + '\n\n' + paragraph;
    if (estimateTokens(potentialChunk) > maxTokensPerChunk && currentChunk !== '') {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

const textractAsync = (filePath: string, config: any) => {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, config, (error: Error | null, text: string) => {
      if (error) reject(error);
      else resolve(text);
    });
  });
};

async function extractTextFromFile(filePath: string, fileExtension: string): Promise<string> {
  try {
    // For text files
    if (fileExtension === '.txt') {
      return readFileSync(filePath, 'utf-8');
    }
    
    // For PDF files
    if (fileExtension === '.pdf') {
      const dataBuffer = readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    }
    
    // For DOCX files
    if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    
    // For DOC files
    if (fileExtension === '.doc') {
      const text = await textractAsync(filePath, {
        preserveLineBreaks: true
      }) as string;
      return text.toString();
    }

    throw new Error(`Unsupported file type: ${fileExtension}`);
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to extract text from ${fileExtension} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function safeJSONParse(data: string) {
  try {
    return { data: JSON.parse(data), error: null };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown parsing error';
    return { data: null, error: errorMessage };
  }
}

async function processChunk(chunk: string, options: any, part: number, total: number) {
  const questionsPerType = Math.ceil(options.questionsPerSection / total);
  
  const prompt = `
    Create an exam in Hebrew based on the following content (part ${part} of ${total}):
    ${chunk}
    
    Requirements:
    Create exactly:
    ${options.openQuestions ? `- ${questionsPerType} open-ended questions (30 points each)` : ''}
    ${options.multipleChoice ? `- ${questionsPerType} multiple-choice questions (20 points each, exactly 4 possible answers)` : ''}
    ${options.singleChoice ? `- ${questionsPerType} single-choice questions (10 points each, exactly 4 possible answers)` : ''}
    
    Return as a JSON object with this exact structure:
    {
      "title": "exam part ${part}",
      "sections": [
        {
          "title": "שאלות פתוחות",
          "instructions": "ענה על השאלות הבאות",
          "questions": [
            {
              "text": "question text here",
              "type": "open-ended",
              "points": 30
            }
          ]
        },
        {
          "title": "שאלות רב-ברירה",
          "instructions": "סמן את כל התשובות הנכונות",
          "questions": [
            {
              "text": "question text here",
              "type": "multiple-choice",
              "points": 20,
              "answers": ["answer1", "answer2", "answer3", "answer4"],
              "correctAnswers": ["answer2", "answer3"]
            }
          ]
        },
        {
          "title": "שאלות בחירה יחידה",
          "instructions": "סמן תשובה אחת נכונה",
          "questions": [
            {
              "text": "question text here",
              "type": "single-choice",
              "points": 10,
              "answers": ["answer1", "answer2", "answer3", "answer4"],
              "correctAnswers": ["answer2"]
            }
          ]
        }
      ]
    }`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are an expert at creating exams in Hebrew. Always return valid JSON that matches the exact structure provided."
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from API');
    }

    // Clean and parse the JSON response
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content that failed to parse:', cleanedContent);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Store uploaded files temporarily (in production, use a database)
const uploadedFiles = new Map<string, UploadedFile>();

// Modify the upload endpoint to only handle file upload
app.post('/api/upload', upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const fileId = Date.now().toString();
    const fileData: UploadedFile = {
      id: fileId,
      filename: req.file.originalname,
      path: req.file.path
    };

    uploadedFiles.set(fileId, fileData);

    res.json({ 
      success: true, 
      fileId,
      filename: req.file.originalname 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload file', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Move the exam generation logic into a reusable function
async function generateExam(fileData: UploadedFile, options: ExamOptions): Promise<ExamData> {
  // Extract text from file if not already extracted
  if (!fileData.content) {
    const fileExtension = path.extname(fileData.filename).toLowerCase();
    fileData.content = await extractTextFromFile(fileData.path, fileExtension);
  }

  // Split content into chunks
  const chunks = splitTextIntoChunks(fileData.content);

  // Process chunks
  const results = await Promise.all(
    chunks.map((chunk, index) => processChunk(chunk, options, index + 1, chunks.length))
  );

  // Combine results
  return {
    title: "מבחן",
    sections: results.flatMap(result => result.sections)
  };
}

// Modify create exam endpoint to use the function directly
app.post('/api/create-exam', upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const options = JSON.parse(req.body.options);
    const fileData: UploadedFile = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      path: req.file.path
    };

    // Generate exam content directly
    const examData = await generateExam(fileData, options);
    
    res.json({ 
      success: true,
      exam: examData
    });

  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ 
      error: 'Failed to create exam', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Remove the redundant /api/generate-exam endpoint since its functionality 
// is now integrated into create-exam

// Modify alias generation to use fileId
app.post('/api/generate-alias', async (req: express.Request, res: express.Response) => {
  try {
    const { fileId } = req.body;
    
    const fileData = uploadedFiles.get(fileId);
    if (!fileData) {
      throw new Error('File not found');
    }

    // Extract content if not already extracted
    if (!fileData.content) {
      const fileExtension = path.extname(fileData.filename).toLowerCase();
      fileData.content = await extractTextFromFile(fileData.path, fileExtension);
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert at creating exam titles and descriptions in Hebrew. Return only valid JSON with exactly two fields: title (2-5 words) and description (1-2 sentences)."
        },
        {
          role: "user",
          content: `Based on this exam content, generate a short Hebrew title and brief description:
          Content: ${fileData.content.substring(0, 500)}...
          
          Return as JSON with this structure:
          {
            "title": "short title here",
            "description": "brief description here"
          }`
        }
      ],
      model: "deepseek-chat",
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from API');
    }

    // Parse and validate the response
    const cleanedContent = cleanJsonResponse(content);
    const metadata = JSON.parse(cleanedContent);

    if (!metadata.title || !metadata.description) {
      throw new Error('Invalid AI response format');
    }

    res.json({
      title: metadata.title,
      description: metadata.description
    });
    
  } catch (error) {
    console.error('Error generating metadata:', error);
    res.status(500).json({ 
      error: 'Failed to generate exam metadata', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/test', async (req: express.Request, res: express.Response) => { 
   console.log('/api/test reached');
   res.json("test");
   return;
});

app.post('/api/evaluate', async (req: express.Request, res: express.Response) => {
  try {
    const { question, answer } = req.body;
    if (!question || !question.id || !answer) {
      return res.status(400).json({ error: 'Missing question or answer' });
    }

    // For single/multiple choice questions
    if (question.type !== 'open-ended') {
      const { data: answers, error: aError } = await supabase
        .from('answers')
        .select('*')
        .eq('question_id', question.id);

      if (!aError && answers && answers.length > 0) {
        const correctAnswers = answers
          .filter((ans: any) => ans.is_correct)
          .map((ans: any) => ans.text);

        if (question.type === 'single-choice') {
          const userAnswer = Array.isArray(answer) ? answer[0] : answer;
          const isCorrect = correctAnswers.includes(userAnswer);
          return res.json({
            score: isCorrect ? 100 : 0,
            feedback: isCorrect ? 'תשובה נכונה' : 'תשובה שגויה',
            correctAnswer: correctAnswers[0]
          });
        } else { // multiple-choice
          const userAnswers = Array.isArray(answer) ? answer : [answer];
          const totalCorrect = correctAnswers.length;
          const correctCount = userAnswers.filter(ans => correctAnswers.includes(ans)).length;
          const score = Math.round((correctCount / totalCorrect) * 100);

          return res.json({
            score,
            feedback: `זיהית ${correctCount} מתוך ${totalCorrect} תשובות נכונות`,
            correctAnswer: correctAnswers
          });
        }
      }
    }

    // For open-ended questions, use AI evaluation
    const prompt = `עליך להעריך את תשובת התלמיד לשאלה הבאה:
שאלה: ${question.text}
תשובת התלמיד: ${answer}

אנא הערך את התשובה וספק:
1. ציון (0-100)
2. משוב מפורט בעברית
3. דוגמה לתשובה נכונה

החזר את התשובה בפורמט JSON הבא:
{
  "score": number,
  "feedback": "משוב מפורט",
  "correctAnswer": "דוגמה לתשובה נכונה"
}`;

const completion = await openai.chat.completions.create({
  messages: [
    {
      role: "system",
      content: "אתה מומחה בהערכת תשובות לשאלות פתוחות. עליך להעריך את התשובה באופן מקצועי ולספק משוב מפורט. הקפד להחזיר תשובה בפורמט JSON בדיוק כמו בדוגמה, ללא תוספות או קוד מיותר."
    },
    {
      role: "user",
      content: `אנא הערך את תשובת התלמיד הבאה:
שאלה: ${question.text}
תשובת התלמיד: ${answer}

יש להחזיר תשובה בדיוק בפורמט הזה:
{
"score": 70,
"feedback": "המשוב כאן",
"correctAnswer": "תשובה נכונה לדוגמה"
}`
    }
  ],
  model: "deepseek-chat",
});

const content = completion.choices[0]?.message?.content;
if (!content) {
  throw new Error('No content received from AI');
}

// Clean any code block markers and extra whitespace
const cleanedContent = content
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .trim();

// Parse and validate AI response
const evaluation = JSON.parse(cleanedContent);
console.log('AI response:', evaluation);
if (typeof evaluation.score !== 'number' ||
  !evaluation.feedback ||
  !evaluation.correctAnswer) {
  console.log('Invalid response format:', evaluation);
  throw new Error('Invalid AI response format');
}

    return res.json(evaluation);
    
  } catch (error) {
    console.error('Evaluation error:', error);
    return res.status(500).json({
      error: 'Failed to evaluate answer',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});