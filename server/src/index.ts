import { Exam } from './models/Exam';
import { Question } from './models/Question';

// Example usage
const exam = new Exam('Math Test - Chapter 1');

const question1 = new Question({
  id: '1',
  text: 'What is 2 + 2?',
  points: 5,
  type: 'multiple-choice',
  answers: ['3', '4', '5', '6'],
  correctAnswer: '4'
});

const question2 = new Question({
  id: '2',
  text: 'Explain the concept of addition.',
  points: 10,
  type: 'open-ended'
});

exam.addQuestion(question1);
exam.addQuestion(question2);

console.log(exam.generateExam());
