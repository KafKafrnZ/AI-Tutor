import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
  plan: string;
}

interface AppState {
  // User / Auth state (FIX-17)
  user: User | null;
  setUser: (user: User | null) => void;

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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),

      // Tutor
      tutorMessages: [],
      setTutorMessages: (messages) => set({ tutorMessages: messages }),
      
      // Practice
      practiceTopic: '',
      setPracticeTopic: (topic) => set({ practiceTopic: topic }),
      practiceQuestions: [],
      setPracticeQuestions: (questions) => set({ practiceQuestions: questions }),
      practiceAnswers: {},
      setPracticeAnswers: (answers) => set({ practiceAnswers: answers }),
    }),
    {
      name: 'ibps-so-app-store',
      // FIX-18: Only persist safe, non-sensitive fields. Never persist auth tokens or full practice answers (stale data risk).
      partialize: (state) => ({
        tutorMessages: state.tutorMessages,
        practiceTopic: state.practiceTopic,
        // practiceQuestions / answers intentionally NOT persisted
      }),
    }
  )
);