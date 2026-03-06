import toast from 'react-hot-toast';
import { fetchAIQuestions, fetchAIQuestionsStream, regenerateText } from '../api/bookApi';

export const createQuestionsSlice = (set, get) => ({
  aiQuestions: [],
  questionAnswers: {},
  isLoadingQuestions: false,
  isLoadingMoreQuestions: false,
  visibleQuestionCount: 0,
  _questionRevealTimer: null,
  rephrasingQuestionId: null,
  isRephrasingStory: false,
  /** Real progress from SSE: { stage, message, progress } */
  questionLoadingStage: null,

  rephraseStory: async () => {
    const s = get();
    const text = s.textInput;
    if (!text?.trim()) return;
    set({ isRephrasingStory: true });
    try {
      const result = await regenerateText({
        chapter_index: 0,
        spread_index: 0,
        field_name: 'story',
        current_text: text,
        instruction: 'Rephrase this love story to be more vivid, heartfelt, and detailed while keeping the same meaning and personal details. Keep it in first person.',
        context: `Partner names: ${s.partnerNames.join(' & ')}`,
      });
      if (result?.new_text) {
        set({ textInput: result.new_text, isRephrasingStory: false });
      } else {
        set({ isRephrasingStory: false });
      }
    } catch {
      set({ isRephrasingStory: false });
    }
  },

  cleanupQuestionTimers: () => {
    const timer = get()._questionRevealTimer;
    if (timer) {
      clearInterval(timer);
      set({ _questionRevealTimer: null });
    }
  },

  fetchQuestions: async (questionCount = 6) => {
    const s = get();
    if (s.isLoadingQuestions || s.aiQuestions.length > 0) return;
    // Clear any existing timer before starting
    get().cleanupQuestionTimers();
    set({ isLoadingQuestions: true, visibleQuestionCount: 0, questionLoadingStage: null });
    try {
      const result = await fetchAIQuestionsStream(
        {
          images: s.images,
          partnerNames: s.partnerNames,
          relationshipType: 'couple',
          questionCount,
        },
        // onProgress — receives real SSE events from backend
        (event) => {
          if (event.stage !== 'complete') {
            set({ questionLoadingStage: event });
          }
        },
      );
      const questions = result?.questions || [];
      set({ aiQuestions: questions, isLoadingQuestions: false, questionLoadingStage: null });
      // Start progressive reveal
      if (questions.length > 0) {
        set({ visibleQuestionCount: 1 });
        const timer = setInterval(() => {
          const current = get().visibleQuestionCount;
          const total = get().aiQuestions.length;
          if (current >= total) {
            clearInterval(timer);
            set({ _questionRevealTimer: null });
            return;
          }
          set({ visibleQuestionCount: current + 1 });
        }, 800);
        set({ _questionRevealTimer: timer });
      }
    } catch {
      set({ aiQuestions: [], isLoadingQuestions: false, questionLoadingStage: null });
    }
  },

  fetchMoreQuestions: async (count) => {
    const s = get();
    if (s.isLoadingMoreQuestions) return;
    // Clear any existing reveal timer before starting new one
    get().cleanupQuestionTimers();
    set({ isLoadingMoreQuestions: true });
    try {
      const existingTexts = new Set(s.aiQuestions.map(q => q.question_text.trim().toLowerCase()));

      const result = await fetchAIQuestions({
        images: s.images,
        partnerNames: s.partnerNames,
        relationshipType: 'couple',
        extraCount: count,
        existingQuestions: s.aiQuestions.map(q => q.question_text),
      });
      const rawQuestions = result.questions || [];

      // Deduplicate by text only (backend may reuse IDs)
      const deduped = rawQuestions.filter(q =>
        !existingTexts.has(q.question_text.trim().toLowerCase())
      );

      // If all returned questions are duplicates, re-ID them and take anyway
      const newQuestions = deduped.length > 0
        ? deduped.slice(0, count)
        : rawQuestions.slice(0, count).map((q, i) => ({
            ...q,
            question_id: `extra_${Date.now()}_${i}`,
          }));

      if (newQuestions.length === 0) {
        set({ isLoadingMoreQuestions: false });
        toast('No questions generated. Try again!');
        return;
      }

      // Ensure unique IDs by re-stamping
      const existingIds = new Set(s.aiQuestions.map(q => q.question_id));
      const stamped = newQuestions.map((q, i) => ({
        ...q,
        question_id: existingIds.has(q.question_id) ? `more_${Date.now()}_${i}` : q.question_id,
      }));

      set((state) => ({
        aiQuestions: [...state.aiQuestions, ...stamped],
        isLoadingMoreQuestions: false,
      }));
      // Progressively reveal the new questions
      const revealStart = get().visibleQuestionCount;
      let revealed = 0;
      const timer = setInterval(() => {
        revealed++;
        set({ visibleQuestionCount: revealStart + revealed });
        if (revealed >= stamped.length) {
          clearInterval(timer);
          set({ _questionRevealTimer: null });
        }
      }, 600);
      set({ _questionRevealTimer: timer });
    } catch {
      set({ isLoadingMoreQuestions: false });
      toast.error('Failed to generate questions');
    }
  },

  rephraseAnswer: async (questionId) => {
    const s = get();
    const answer = s.questionAnswers[questionId];
    if (!answer?.trim()) return;
    const question = s.aiQuestions.find(q => q.question_id === questionId);
    if (!question) return;
    set({ rephrasingQuestionId: questionId });
    try {
      const result = await regenerateText({
        chapter_index: 0,
        spread_index: 0,
        field_name: 'answer',
        current_text: answer,
        instruction: 'Rephrase this answer to be more vivid, heartfelt, and detailed while keeping the same meaning and personal details. Keep it in first person.',
        context: `Question: ${question.question_text}`,
      });
      if (result?.new_text) {
        set((state) => ({
          questionAnswers: { ...state.questionAnswers, [questionId]: result.new_text },
          rephrasingQuestionId: null,
        }));
      } else {
        set({ rephrasingQuestionId: null });
      }
    } catch {
      set({ rephrasingQuestionId: null });
    }
  },

  setQuestionAnswer: (id, answer) => {
    set((s) => ({ questionAnswers: { ...s.questionAnswers, [id]: answer } }));
  },

  skipAllQuestions: () => {
    const timer = get()._questionRevealTimer;
    if (timer) clearInterval(timer);
    set({ aiQuestions: [], questionAnswers: {}, _questionRevealTimer: null, visibleQuestionCount: 0 });
  },
});
