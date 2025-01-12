import { Question } from './Question';

export class Exam {
  private title: string;
  private questions: Question[];
  private totalPoints: number;

  constructor(title: string) {
    this.title = title;
    this.questions = [];
    this.totalPoints = 0;
  }

  addQuestion(question: Question): void {
    this.questions.push(question);
    this.calculateTotalPoints();
  }

  private calculateTotalPoints(): void {
    this.totalPoints = this.questions.reduce((sum, question) => {
      return sum + question.getPoints();
    }, 0);
  }

  generateExam(): string {
    let output = `${this.title}\nTotal Points: ${this.totalPoints}\n\n`;
    this.questions.forEach((question, index) => {
      output += `Question ${index + 1}: ${question.getFormattedQuestion()}\n`;
    });
    return output;
  }
}
