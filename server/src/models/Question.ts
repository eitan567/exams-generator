import { Answer } from './Answer';

export interface QuestionOptions {
  id: string;
  text: string;
  points: number;
  type: 'multiple-choice' | 'open-ended';
  answers?: Answer[];
  correctAnswer?: string | number;
}

export class Question {
  private id: string;
  private text: string;
  private points: number;
  private type: 'multiple-choice' | 'open-ended';
  private answers?: Answer[];
  private correctAnswer?: string | number;

  constructor(options: QuestionOptions) {
    this.id = options.id;
    this.text = options.text;
    this.points = options.points;
    this.type = options.type;
    this.answers = options.answers;
    this.correctAnswer = options.correctAnswer;
  }

  getPoints(): number {
    return this.points;
  }

  getId(): string {
    return this.id;
  }

  getText(): string {
    return this.text;
  }

  getType(): 'multiple-choice' | 'open-ended' {
    return this.type;
  }

  getAnswers(): Answer[] | undefined {
    return this.answers;
  }

  getCorrectAnswer(): string | number | undefined {
    return this.correctAnswer;
  }

  getFormattedQuestion(): string {
    let output = `${this.text} (${this.points} points)\n`;
    if (this.type === 'multiple-choice' && this.answers) {
      this.answers.forEach((answer, index) => {
        output += `${index + 1}. ${answer.getText()}\n`;
      });
    }
    return output;
  }
}
