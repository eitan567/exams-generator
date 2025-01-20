export interface AnswerOptions {
  id: string;
  question_id: string;
  text: string;
  is_correct?: boolean;
  points?: number;
  order_index: number;
  created_at: string;
  is_ai_generated: boolean;
}

export class Answer {
  private id: string;
  private question_id: string;
  private text: string;
  private is_correct?: boolean;
  private points?: number;
  private order_index: number;
  private created_at: string;
  private is_ai_generated: boolean;

  constructor(options: AnswerOptions) {
    this.id = options.id;
    this.question_id = options.question_id;
    this.text = options.text;
    this.is_correct = options.is_correct;
    this.points = options.points || 0;
    this.order_index = options.order_index;
    this.created_at = options.created_at;
    this.is_ai_generated = options.is_ai_generated;
  }

  getId(): string {
    return this.id;
  }

  getQuestionId(): string {
    return this.question_id;
  }

  getText(): string {
    try {
      const parsed = JSON.parse(this.text);
      return parsed.text || this.text;
    } catch {
      return this.text;
    }
  }

  getPoints(): number {
    try {
      const parsed = JSON.parse(this.text);
      return parsed.points || this.points || 0;
    } catch {
      return this.points || 0;
    }
  }

  isCorrect(): boolean | undefined {
    return this.is_correct;
  }

  getOrderIndex(): number {
    return this.order_index;
  }

  getCreatedAt(): string {
    return this.created_at;
  }

  isAiGenerated(): boolean {
    return this.is_ai_generated;
  }
}
