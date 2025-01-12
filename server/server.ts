import express from 'express';
import multer from 'multer';
import { OpenAI } from 'openai';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { parseOfficeAsync } from 'officeparser';  // Update import
import mammoth from 'mammoth';
import textract from 'textract';
import { promisify } from 'util';

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

const app = express();

// Add middleware
app.use(cors());
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
  apiKey: 'sk-0e8e8e6d01934127a89c441bcd5f5327'
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

// Add this endpoint to your server.ts file
app.post('/api/generate-alias', async (req: express.Request, res: express.Response) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert at creating short, descriptive Hebrew titles for exams. Create a title that captures the main subject and level of the exam."
        },
        {
          role: "user",
          content: `Generate a short, descriptive Hebrew alias (2-5 words) for an exam with the following content: ${content}`
        }
      ],
      model: "deepseek-chat",
    });

    const alias = completion.choices[0]?.message?.content || 'מבחן חדש';
    res.json({ alias });
    
  } catch (error) {
    console.error('Error generating alias:', error);
    res.status(500).json({ 
      error: 'Failed to generate alias', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/upload', upload.single('file'), async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const { data: options, error } = safeJSONParse(req.body.options);

    if (error) {
      console.error('Invalid JSON format:', error);
      res.status(400).json({ error: 'Invalid JSON format in request body' });
      return;
    }

    // Extract text from the file using officeparser
    console.log('Extracting text from file...');
    const fileContent = await extractTextFromFile(req.file.path, fileExtension);
    console.log('Text extracted successfully');

    // Split content into chunks that fit within token limits
    const chunks = splitTextIntoChunks(fileContent);
    console.log(`Split content into ${chunks.length} chunks`);

    // Process all chunks in parallel
    const chunkPromises = chunks.map((chunk, index) => 
      processChunk(chunk, options, index + 1, chunks.length)
    );

    const results = await Promise.all(chunkPromises);

    // Combine all results
    const finalExam: ExamData = {
      title: "מבחן",
      sections: results.flatMap(result => result.sections)
    };

    console.log('Final exam generated successfully');
    res.json(finalExam);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate exam', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/evaluate', async (req: express.Request, res: express.Response) => {
  try {
    const { question, answer } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        received: { question, answer } 
      });
    }

    const prompt = `
      העריכו את התשובה הבאה לשאלה הנתונה:
      שאלה: ${question.text}
      תשובת התלמיד: ${answer}
      סוג השאלה: ${question.type}
      ניקוד מלא לשאלה: ${question.points || 0} נקודות
      
      אנא ספקו:
      1. ציון (0-100), לפי הכללים הבאים:
         - בשאלות בחירה יחידה: 0 או 100 נקודות בלבד
         - בשאלות בחירה מרובה: הציון יחסי למספר התשובות הנכונות
         - בשאלות פתוחות: הערכה לפי איכות התשובה
      
      2. משוב בעברית המסביר את הציון
      
      3. ציינו את התשובה/תשובות הנכונות
      
      החזירו אך ורק אובייקט JSON בפורמט הבא:
      {
        "score": number,
        "feedback": "המשוב בעברית",
        "correctAnswer": "התשובה הנכונה" או ["תשובה 1", "תשובה 2"] למספר תשובות
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `You are an expert teacher evaluating exam answers. Follow these strict scoring rules:

          1. For single-choice questions:
             - Only give scores of 0 or 100 (no partial credit)
             - If answer is incorrect, score MUST be 0
             - Include the correct answer in the response

          2. For multiple-choice questions:
             - Score is proportional to correct answers selected
             - Example: If there are 3 correct answers and student selected 2, score = 66
             - List ALL correct answers in the response

          3. For open-ended questions:
             - Evaluate based on content, accuracy, and completeness
             - Provide detailed feedback explaining score
             - Include an example of a complete correct answer

          Always provide feedback in Hebrew only (except for technical terms).
          Always include the correct answer(s) in the response.
          Return only valid JSON format.`
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('לא התקבלה תשובה מה-API');
    }

    // Clean and parse the response
    const cleanedContent = cleanJsonResponse(content);
    console.log('תוכן המשוב המנוקה:', cleanedContent);
    
    try {
      const evaluation = JSON.parse(cleanedContent);
      
      // Additional validation for single-choice questions
      if (question.type === 'single-choice' && evaluation.score !== 0 && evaluation.score !== 100) {
        evaluation.score = 0;
        evaluation.feedback = `תשובה שגויה. ${evaluation.feedback}`;
      }

      res.json(evaluation);
    } catch (parseError) {
      console.error('שגיאת ניתוח JSON:', parseError);
      console.error('התוכן שנכשל בניתוח:', cleanedContent);
      throw new Error('נכשל בניתוח תשובת ה-API כ-JSON');
    }
  } catch (error) {
    console.error('שגיאת הערכה:', error);
    res.status(500).json({ 
      error: 'נכשל בהערכת התשובה',
      details: error instanceof Error ? error.message : 'שגיאה לא ידועה'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});