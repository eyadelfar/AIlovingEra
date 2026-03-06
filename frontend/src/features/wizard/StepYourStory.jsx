import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/shallow';
import useBookStore from '../../stores/bookStore';
import VoiceRecorder from '../shared/VoiceRecorder';

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

const PROMPT_KEYS = [
  'promptHowDidYouMeet',
  'promptFavoriteMemory',
  'promptWhatMakesSpecial',
  'promptInsideJokes',
];

// Stage definitions with icons and order for the progress stepper
const QUESTION_STAGES = [
  { key: 'metadata',   icon: 'camera' },
  { key: 'analyzing',  icon: 'eye' },
  { key: 'generating', icon: 'sparkle' },
];

function StageIcon({ type, active, done }) {
  const base = 'w-5 h-5 transition-colors duration-300';
  const color = done ? 'text-emerald-400' : active ? 'text-rose-400' : 'text-gray-600';
  const cls = `${base} ${color}`;

  if (done) return (
    <svg className={cls} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
  if (type === 'camera') return (
    <svg className={cls} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
  if (type === 'eye') return (
    <svg className={cls} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  // sparkle
  return (
    <svg className={cls} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function QuestionsLoadingAnimation({ t, stage }) {
  const currentStageKey = stage?.stage || 'metadata';
  const progress = stage?.progress || 0;
  const message = stage?.message || t('analyzingPhotos');

  const activeIdx = QUESTION_STAGES.findIndex(s => s.key === currentStageKey);

  return (
    <div className="py-8 flex flex-col items-center gap-6">
      {/* Stage stepper */}
      <div className="flex items-center gap-0 w-full max-w-xs">
        {QUESTION_STAGES.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={s.key} className="flex items-center flex-1">
              {/* Step circle */}
              <motion.div
                animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                transition={isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isDone
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : isActive
                      ? 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
                      : 'bg-gray-800/50 border-gray-700'
                }`}
              >
                <StageIcon type={s.icon} active={isActive} done={isDone} />
                {isActive && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-rose-400/30"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </motion.div>
              {/* Connector line */}
              {i < QUESTION_STAGES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1.5 rounded-full bg-gray-700 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: isDone ? '100%' : isActive ? '50%' : '0%' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage labels */}
      <div className="flex w-full max-w-xs">
        {QUESTION_STAGES.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <p
              key={s.key}
              className={`flex-1 text-center text-[10px] font-medium transition-colors duration-300 ${
                isDone ? 'text-emerald-400/70' : isActive ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {t(`qStage_${s.key}`)}
            </p>
          );
        })}
      </div>

      {/* Live message from backend */}
      <div className="h-10 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-gray-400 text-sm text-center"
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Real progress bar */}
      <div className="w-56 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 rounded-full"
          animate={{ width: `${Math.max(progress, 3)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function StepYourStory() {
  const { t } = useTranslation('wizard');
  // Actions (stable refs, won't cause re-renders)
  const actions = useBookStore(
    useShallow(s => ({
      setTextInput: s.setTextInput,
      fetchQuestions: s.fetchQuestions,
      setQuestionAnswer: s.setQuestionAnswer,
      skipAllQuestions: s.skipAllQuestions,
      rephraseAnswer: s.rephraseAnswer,
      rephraseStory: s.rephraseStory,
    })),
  );
  // State values (batched selector — only re-renders when any of these actually change)
  const state = useBookStore(
    useShallow(s => ({
      textInput: s.textInput,
      aiQuestions: s.aiQuestions,
      questionAnswers: s.questionAnswers,
      isLoadingQuestions: s.isLoadingQuestions,
      visibleQuestionCount: s.visibleQuestionCount,
      rephrasingQuestionId: s.rephrasingQuestionId,
      isRephrasingStory: s.isRephrasingStory,
      images: s.images,
      questionLoadingStage: s.questionLoadingStage,
    })),
  );

  const cleanupQuestionTimers = useBookStore(s => s.cleanupQuestionTimers);
  const {
    setTextInput, fetchQuestions, setQuestionAnswer, skipAllQuestions,
    rephraseAnswer, rephraseStory,
  } = actions;
  const {
    textInput, aiQuestions, questionAnswers, isLoadingQuestions,
    visibleQuestionCount, rephrasingQuestionId, isRephrasingStory,
    images, questionLoadingStage,
  } = state;

  // Cleanup question reveal timers on unmount to prevent leaks
  useEffect(() => {
    return () => cleanupQuestionTimers();
  }, [cleanupQuestionTimers]);

  // Debounce story textarea — local state for immediate UI, sync to store after 300ms
  const [localStory, setLocalStory] = useState(textInput);
  const storyTimerRef = useRef(null);
  useEffect(() => { setLocalStory(textInput); }, [textInput]);
  const handleStoryChange = useCallback((val) => {
    setLocalStory(val);
    clearTimeout(storyTimerRef.current);
    storyTimerRef.current = setTimeout(() => setTextInput(val), 300);
  }, [setTextInput]);

  // Debounce answer input — per-question local state
  const [localAnswers, setLocalAnswers] = useState({});
  const answerTimerRef = useRef({});
  const handleAnswerChange = useCallback((qId, val) => {
    setLocalAnswers(prev => ({ ...prev, [qId]: val }));
    clearTimeout(answerTimerRef.current[qId]);
    answerTimerRef.current[qId] = setTimeout(() => setQuestionAnswer(qId, val), 300);
  }, [setQuestionAnswer]);
  // Sync local answers from store (e.g. after AI rephrase)
  const getDisplayAnswer = (qId) => {
    if (localAnswers[qId] !== undefined) return localAnswers[qId];
    return questionAnswers[qId] || '';
  };
  // Reset local answer when store answer changes (rephrase)
  useEffect(() => {
    setLocalAnswers(prev => {
      const next = { ...prev };
      let changed = false;
      for (const [qId, val] of Object.entries(questionAnswers)) {
        if (prev[qId] !== undefined && prev[qId] !== val) {
          next[qId] = val;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [questionAnswers]);

  const [questionCount, setQuestionCount] = useState(6);

  function handleStoryTranscribed(text) {
    const current = useBookStore.getState().textInput;
    setTextInput(current ? current + ' ' + text : text);
  }

  function handleQuestionTranscribed(questionId, text) {
    const current = useBookStore.getState().questionAnswers[questionId] || '';
    setQuestionAnswer(questionId, current ? current + ' ' + text : text);
  }

  const answeredCount = Object.values(questionAnswers).filter(a => a.trim()).length;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">{t('yourStoryTitle')}</h2>
      <p className="text-gray-400 mb-8">
        {t('yourStoryDesc')}
      </p>

      {/* ── Story textarea ── */}
      <div className="mb-10">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t('tellUsYourStory')}
        </label>

        <div className="flex flex-wrap gap-2 mb-3">
          {PROMPT_KEYS.map(key => {
            const prompt = t(key);
            return (
            <button
              key={key}
              onClick={() => { const val = localStory ? localStory + '\n' + prompt + ' ' : prompt + ' '; setLocalStory(val); setTextInput(val); }}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors border border-gray-700"
            >
              {prompt}
            </button>
            );
          })}
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-rose-500/50 focus-within:border-rose-500/50 transition-shadow">
          <textarea
            value={localStory}
            onChange={e => { handleStoryChange(e.target.value); autoResize(e.target); }}
            ref={el => { if (el) autoResize(el); }}
            placeholder={t('storyPlaceholder')}
            rows={4}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-gray-200 placeholder-gray-500 focus:outline-none resize-none overflow-hidden"
            style={{ minHeight: '6rem' }}
          />
          <div className="flex items-center justify-end gap-1.5 px-3 pb-2 border-t border-gray-800/60">
            <VoiceRecorder onTranscribed={handleStoryTranscribed} />
            <button
              onClick={rephraseStory}
              disabled={!localStory?.trim() || isRephrasingStory}
              title={localStory?.trim() ? t('aiRephraseStory') : t('writeSomethingFirst')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-40 disabled:cursor-not-allowed ${
                localStory?.trim()
                  ? 'bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/40 text-violet-400'
                  : 'bg-gray-800 border border-gray-700 text-gray-500'
              }`}
            >
              {isRephrasingStory ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Questions (opt-in) ── */}
      <div>
        {aiQuestions.length === 0 && !isLoadingQuestions ? (
          <div className="text-center py-8 border border-dashed border-gray-700 rounded-xl">
            <p className="text-gray-400 text-sm mb-5">{t('answerQuestionsLabel')}</p>

            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="text-xs text-gray-500">{t('howManyQuestions')}</span>
              <div className="flex items-center gap-1 bg-gray-800/60 border border-gray-700 rounded-lg px-1.5">
                <button
                  onClick={() => setQuestionCount(c => Math.max(1, c - 1))}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-medium text-gray-200">{questionCount}</span>
                <button
                  onClick={() => setQuestionCount(c => Math.min(20, c + 1))}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={() => fetchQuestions(questionCount)}
              disabled={images.length === 0}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              {t('generateNQuestions', { count: questionCount })}
            </button>
            {images.length === 0 && (
              <p className="text-gray-600 text-xs mt-2">{t('noQuestionsYet')}</p>
            )}
          </div>
        ) : isLoadingQuestions ? (
          <QuestionsLoadingAnimation t={t} stage={questionLoadingStage} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">
                {t('answeredOf', { answered: answeredCount, total: aiQuestions.length })}
              </p>
              <button
                onClick={skipAllQuestions}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {t('skipAll')}
              </button>
            </div>

            <div className="space-y-4">
              {aiQuestions.slice(0, visibleQuestionCount).map((q, idx) => {
                const answer = getDisplayAnswer(q.question_id);
                const hasAnswer = answer.trim().length > 0;
                const isRephrasing = rephrasingQuestionId === q.question_id;

                return (
                  <motion.div
                    key={q.question_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-gray-900/40 border border-gray-800 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-500/10 text-rose-400 text-sm font-medium flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-200 font-medium">{q.question_text}</p>
                        {q.context_hint && (
                          <p className="text-xs text-gray-500 mt-1">{q.context_hint}</p>
                        )}
                      </div>
                    </div>

                    {q.related_photo_indices?.length > 0 && (
                      <div className="flex gap-2 mb-3 ms-0 sm:ms-10">
                        {q.related_photo_indices.map(photoIdx => {
                          const img = images[photoIdx];
                          if (!img) return null;
                          return (
                            <img
                              key={photoIdx}
                              src={img.previewUrl}
                              alt={t('photoLabel', { number: photoIdx + 1 })}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-700"
                            />
                          );
                        })}
                      </div>
                    )}

                    <div className="ms-0 sm:ms-10">
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-rose-500/50 focus-within:border-rose-500/50 transition-shadow">
                        <textarea
                          value={answer}
                          onChange={(e) => { handleAnswerChange(q.question_id, e.target.value); autoResize(e.target); }}
                          ref={el => { if (el) autoResize(el); }}
                          placeholder={t('answerPlaceholder')}
                          rows={2}
                          className="w-full bg-transparent px-4 pt-2.5 pb-1.5 text-gray-200 placeholder-gray-600 text-sm focus:outline-none resize-none overflow-hidden"
                          style={{ minHeight: '2.75rem' }}
                        />
                        <div className="flex items-center justify-end gap-1.5 px-2 pb-1.5 border-t border-gray-700/50">
                          <VoiceRecorder
                            onTranscribed={(text) => handleQuestionTranscribed(q.question_id, text)}
                          />
                          <button
                            onClick={() => rephraseAnswer(q.question_id)}
                            disabled={!hasAnswer || isRephrasing}
                            title={hasAnswer ? t('aiRephraseAnswer') : t('writeAnswerFirst')}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-40 disabled:cursor-not-allowed ${
                              hasAnswer
                                ? 'bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/40 text-violet-400'
                                : 'bg-gray-800 border border-gray-700 text-gray-500'
                            }`}
                          >
                            {isRephrasing ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {visibleQuestionCount < aiQuestions.length && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-2"
              >
                <span className="inline-block w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
                {t('moreQuestionsIncoming')}
              </motion.p>
            )}

          </>
        )}
      </div>
    </div>
  );
}
