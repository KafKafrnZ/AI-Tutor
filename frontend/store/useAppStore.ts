import { create } from 'zustand';

interface AppState {
  // Tutor State
  tutorMessages: { role: "user" | "assistant"; content: string }[];
  setTutorMessages: (messages: { role: "user" | "assistant"; content: string }[]) => void;
  
  // Practice State
  practiceTopic: string;
  setPracticeTopic: (topic: string) => void;
  practiceQuestions: any[];
  setPracticeQuestions: (questions: any[]) => void;
  practiceAnswers: Record<number, string>;
  setPracticeAnswers: (answers: Record<number, string>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tutorMessages: [],
  setTutorMessages: (messages) => set({ tutorMessages: messages }),
  
  practiceTopic: '',
  setPracticeTopic: (topic) => set({ practiceTopic: topic }),
  practiceQuestions: [],
  setPracticeQuestions: (questions) => set({ practiceQuestions: questions }),
  practiceAnswers: {},
  setPracticeAnswers: (answers) => set({ practiceAnswers: answers }),
}));