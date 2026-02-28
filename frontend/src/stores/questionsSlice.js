import { fetchAIQuestions } from '../api/bookApi';

export const createQuestionsSlice = (set, get) => ({
  // Questions state
  aiQuestions: [],
  questionAnswers: {},
  isLoadingQuestions: false,

  // Questions actions
  fetchQuestions: async () => {
    const s = get();
    if (s.isLoadingQuestions || s.aiQuestions.length > 0) return;
    set({ isLoadingQuestions: true });
    try {
      const result = await fetchAIQuestions({
        images: s.images,
        partnerNames: s.partnerNames,
        relationshipType: 'couple',
      });
      set({ aiQuestions: result.questions || [], isLoadingQuestions: false });
    } catch (err) {
      console.error('Failed to fetch AI questions:', err);
      set({ aiQuestions: [], isLoadingQuestions: false });
    }
  },

  setQuestionAnswer: (id, answer) => {
    set((s) => ({ questionAnswers: { ...s.questionAnswers, [id]: answer } }));
  },

  skipAllQuestions: () => set({ questionAnswers: {} }),
});
