import { WIZARD_STEPS } from '../../lib/constants';

export default function WizardProgress({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
      {WIZARD_STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;

        return (
          <div key={step.label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-rose-500 to-violet-600 text-white shadow-lg shadow-rose-500/25'
                    : isCompleted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-xs hidden sm:block ${isActive ? 'text-white font-medium' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>

            {i < WIZARD_STEPS.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 ${isCompleted ? 'bg-rose-500/40' : 'bg-gray-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
