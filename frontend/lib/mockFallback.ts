export interface FallbackMockTest {
  id: number;
  title: string;
  duration_minutes: number;
  question_count: number;
  difficulty: string;
  is_fallback: boolean;
  source: "local_fallback";
}

export interface FallbackApiQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  correct_answer_text: string;
  explanation: string;
  section: string;
  topic: string;
  source: "local_fallback";
}

export const fallbackMockTests: FallbackMockTest[] = [
  {
    id: 1,
    title: "Government Exam Foundation Mock - Set 1",
    duration_minutes: 90,
    question_count: 6,
    difficulty: "Hard",
    is_fallback: true,
    source: "local_fallback",
  },
  {
    id: 2,
    title: "Reasoning + Quant Special",
    duration_minutes: 75,
    question_count: 6,
    difficulty: "Medium",
    is_fallback: true,
    source: "local_fallback",
  },
  {
    id: 3,
    title: "English + General Awareness Combined",
    duration_minutes: 60,
    question_count: 6,
    difficulty: "Easy",
    is_fallback: true,
    source: "local_fallback",
  },
];

const fallbackQuestionBank: Record<number, Omit<FallbackApiQuestion, "id" | "source">[]> = {
  1: [
    {
      section: "Polity",
      topic: "Constitutional bodies",
      question: "Which constitutional body conducts elections to Parliament and State Legislatures in India?",
      options: ["Union Public Service Commission", "Election Commission of India", "Finance Commission", "NITI Aayog"],
      correct_answer: "B",
      correct_answer_text: "Election Commission of India",
      explanation: "The Election Commission of India conducts elections to Parliament, State Legislatures, and the offices of President and Vice-President.",
    },
    {
      section: "Economy",
      topic: "Inflation",
      question: "A sustained rise in the general price level of goods and services is called:",
      options: ["Deflation", "Inflation", "Disinvestment", "Fiscal deficit"],
      correct_answer: "B",
      correct_answer_text: "Inflation",
      explanation: "Inflation is a broad, sustained increase in prices across the economy.",
    },
    {
      section: "Geography",
      topic: "Monsoon",
      question: "The southwest monsoon in India is primarily driven by:",
      options: ["Western disturbances", "Land-sea pressure difference", "Retreating trade winds", "Polar jet streams"],
      correct_answer: "B",
      correct_answer_text: "Land-sea pressure difference",
      explanation: "Summer heating creates low pressure over land and pulls moisture-laden winds from the ocean.",
    },
    {
      section: "History",
      topic: "Freedom movement",
      question: "The Quit India Movement was launched in which year?",
      options: ["1919", "1930", "1942", "1947"],
      correct_answer: "C",
      correct_answer_text: "1942",
      explanation: "The Quit India Movement began in August 1942.",
    },
    {
      section: "Environment",
      topic: "Biodiversity",
      question: "A species naturally found only in one geographic region is known as:",
      options: ["Invasive", "Endemic", "Migratory", "Extinct"],
      correct_answer: "B",
      correct_answer_text: "Endemic",
      explanation: "Endemic species are restricted to a particular region.",
    },
    {
      section: "CSAT",
      topic: "Percentages",
      question: "If an item's price rises from Rs. 800 to Rs. 920, what is the percentage increase?",
      options: ["12%", "15%", "18%", "20%"],
      correct_answer: "B",
      correct_answer_text: "15%",
      explanation: "Increase = 120. Percentage increase = 120 / 800 x 100 = 15%.",
    },
  ],
  2: [
    {
      section: "Reasoning",
      topic: "Series",
      question: "Find the next number in the series: 3, 9, 27, 81, ?",
      options: ["162", "216", "243", "324"],
      correct_answer: "C",
      correct_answer_text: "243",
      explanation: "Each term is multiplied by 3.",
    },
    {
      section: "Quant",
      topic: "Ratio",
      question: "The ratio of boys to girls is 3:2. If there are 45 boys, how many girls are there?",
      options: ["20", "25", "30", "35"],
      correct_answer: "C",
      correct_answer_text: "30",
      explanation: "3 parts = 45, so 1 part = 15. Girls = 2 parts = 30.",
    },
    {
      section: "Reasoning",
      topic: "Direction sense",
      question: "A person walks 5 km north and then 3 km east. How far is the person from the starting point?",
      options: ["4 km", "5.8 km", "8 km", "10 km"],
      correct_answer: "B",
      correct_answer_text: "5.8 km",
      explanation: "Use Pythagoras: sqrt(5^2 + 3^2) = sqrt(34), approximately 5.8 km.",
    },
    {
      section: "Quant",
      topic: "Simple interest",
      question: "What is the simple interest on Rs. 5,000 at 8% per annum for 2 years?",
      options: ["Rs. 400", "Rs. 600", "Rs. 800", "Rs. 1,000"],
      correct_answer: "C",
      correct_answer_text: "Rs. 800",
      explanation: "SI = PRT / 100 = 5000 x 8 x 2 / 100 = Rs. 800.",
    },
    {
      section: "Reasoning",
      topic: "Blood relation",
      question: "Ravi says, 'She is the daughter of my mother's only son.' How is the woman related to Ravi?",
      options: ["Sister", "Daughter", "Niece", "Cousin"],
      correct_answer: "B",
      correct_answer_text: "Daughter",
      explanation: "Ravi's mother's only son is Ravi, so the woman is Ravi's daughter.",
    },
    {
      section: "Quant",
      topic: "Average",
      question: "The average of five numbers is 24. If one number is removed, the average becomes 22. What is the removed number?",
      options: ["28", "30", "32", "34"],
      correct_answer: "C",
      correct_answer_text: "32",
      explanation: "Original sum = 120. New sum = 88. Removed number = 32.",
    },
  ],
  3: [
    {
      section: "English",
      topic: "Grammar",
      question: "Choose the grammatically correct sentence.",
      options: ["He go to school daily.", "He goes to school daily.", "He going to school daily.", "He gone to school daily."],
      correct_answer: "B",
      correct_answer_text: "He goes to school daily.",
      explanation: "A singular subject in simple present tense takes 'goes'.",
    },
    {
      section: "English",
      topic: "Vocabulary",
      question: "Choose the word closest in meaning to 'prudent'.",
      options: ["Careless", "Wise", "Angry", "Weak"],
      correct_answer: "B",
      correct_answer_text: "Wise",
      explanation: "Prudent means careful and wise in practical matters.",
    },
    {
      section: "General Awareness",
      topic: "Polity",
      question: "Who is the nominal head of the Union Executive in India?",
      options: ["Prime Minister", "President", "Chief Justice of India", "Speaker of Lok Sabha"],
      correct_answer: "B",
      correct_answer_text: "President",
      explanation: "The President is the nominal head; real executive power rests with the Council of Ministers.",
    },
    {
      section: "General Awareness",
      topic: "Economy",
      question: "GDP measures the value of:",
      options: ["Only imports", "Final goods and services produced domestically", "Only taxes", "Only government salaries"],
      correct_answer: "B",
      correct_answer_text: "Final goods and services produced domestically",
      explanation: "GDP measures final goods and services produced within domestic territory.",
    },
    {
      section: "English",
      topic: "Reading logic",
      question: "The main idea of a passage is usually identified by:",
      options: ["One isolated statistic", "The repeated central argument", "The longest sentence", "The first noun"],
      correct_answer: "B",
      correct_answer_text: "The repeated central argument",
      explanation: "The main idea is the central point supported across the passage.",
    },
    {
      section: "General Awareness",
      topic: "Science",
      question: "The SI unit of electric current is:",
      options: ["Volt", "Ohm", "Ampere", "Watt"],
      correct_answer: "C",
      correct_answer_text: "Ampere",
      explanation: "Electric current is measured in amperes.",
    },
  ],
};

export function getFallbackMockTest(id: number): FallbackMockTest {
  return fallbackMockTests.find((test) => test.id === id) || {
    id,
    title: `Mock Test Set ${id}`,
    duration_minutes: 60,
    question_count: fallbackQuestionBank[1].length,
    difficulty: "Medium",
    is_fallback: true,
    source: "local_fallback",
  };
}

export function buildFallbackMockQuestions(id: number): FallbackApiQuestion[] {
  const questions = fallbackQuestionBank[id] || fallbackQuestionBank[1];
  return questions.map((question, index) => ({
    ...question,
    id: (id * 10000) + index + 1,
    source: "local_fallback",
  }));
}
