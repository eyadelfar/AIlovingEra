import { useEffect } from 'react';
import { motion } from 'framer-motion';
import useBookStore from '../../stores/bookStore';
import LoadingSpinner from '../shared/LoadingSpinner';
import VoiceRecorder from '../shared/VoiceRecorder';

const PROMPTS = [
  'How did you two meet?',
  "What's your favorite memory together?",
  'What makes your relationship special?',
  'Any inside jokes or funny moments?',
];

export default function StepYourStory() {
  const textInput = useBookStore(s => s.textInput);
  const setTextInput = useBookStore(s => s.setTextInput);

  const aiQuestions = useBookStore(s => s.aiQuestions);
  const questionAnswers = useBookStore(s => s.questionAnswers);
  const isLoadingQuestions = useBookStore(s => s.isLoadingQuestions);
  const fetchQuestions = useBookStore(s => s.fetchQuestions);
  const setQuestionAnswer = useBookStore(s => s.setQuestionAnswer);
  const skipAllQuestions = useBookStore(s => s.skipAllQuestions);
  const images = useBookStore(s => s.images);

  useEffect(() => {
    if (images.length > 0 && aiQuestions.length === 0 && !isLoadingQuestions) {
      fetchQuestions();
    }
  }, [images.length, aiQuestions.length, isLoadingQuestions, fetchQuestions]);

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
      <h2 className="text-2xl font-bold mb-1">Your Story</h2>
      <p className="text-gray-400 mb-8">
        Share your story in your own words, answer a few AI questions, or both. Everything here is optional.
      </p>

      {/* ── Story textarea ── */}
      <div className="mb-10">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tell us your story in your own words
        </label>

        <div className="flex flex-wrap gap-2 mb-3">
          {PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => setTextInput(textInput ? textInput + '\n' + prompt + ' ' : prompt + ' ')}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors border border-gray-700"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="relative">
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Write your story here, or use the prompts above for inspiration..."
            rows={6}
            className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 resize-none"
          />
          <div className="absolute bottom-3 right-3">
            <VoiceRecorder onTranscribed={handleStoryTranscribed} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          You can also record your story using the microphone button.
        </p>
      </div>

      {/* ── AI Questions ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            Or answer a few questions to help AI write it for you
          </label>
          {aiQuestions.length > 0 && (
            <button
              onClick={skipAllQuestions}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip All
            </button>
          )}
        </div>

        {isLoadingQuestions ? (
          <div className="text-center py-10">
            <LoadingSpinner size="md" />
            <p className="text-gray-500 mt-3 text-sm">Analyzing your photos to ask the right questions...</p>
          </div>
        ) : aiQuestions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No questions generated yet. Upload photos first to get personalized questions.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              {answeredCount} of {aiQuestions.length} answered — all optional
            </p>

            <div className="space-y-4">
              {aiQuestions.map((q, idx) => (
                <motion.div
                  key={q.question_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
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
                    <div className="flex gap-2 mb-3 ml-0 sm:ml-10">
                      {q.related_photo_indices.map(photoIdx => {
                        const img = images[photoIdx];
                        if (!img) return null;
                        return (
                          <img
                            key={photoIdx}
                            src={img.previewUrl}
                            alt={`Photo ${photoIdx + 1}`}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-700"
                          />
                        );
                      })}
                    </div>
                  )}

                  <div className="relative ml-0 sm:ml-10 max-w-full sm:max-w-[calc(100%-2.5rem)]">
                    <textarea
                      value={questionAnswers[q.question_id] || ''}
                      onChange={(e) => setQuestionAnswer(q.question_id, e.target.value)}
                      placeholder="Type or record your answer... (optional)"
                      rows={2}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 pr-14 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 resize-none"
                    />
                    <div className="absolute right-2 bottom-2">
                      <VoiceRecorder
                        onTranscribed={(text) => handleQuestionTranscribed(q.question_id, text)}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
