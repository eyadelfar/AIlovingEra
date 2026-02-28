import { TEMPLATE_STYLES } from './templateStyles';
import PageShell from './PageShell';
import { Divider } from './PageShell';

export default function LoveLetterPage({ text, templateSlug }) {
  if (!text) return null;

  const style = TEMPLATE_STYLES[templateSlug] || TEMPLATE_STYLES.romantic;

  return (
    <div className="max-w-sm sm:max-w-md mx-auto">
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-sm w-full">
          {/* Header */}
          <h3 className={`text-2xl font-bold ${style.heading} mb-2 text-center`}>
            A Letter For You
          </h3>
          <Divider className={`${style.divider} mb-6`} />

          {/* Letter body */}
          <div className={`${style.body} leading-relaxed text-sm whitespace-pre-line text-center`}>
            {text}
          </div>

          {/* Heart divider at bottom */}
          <div className="mt-8 flex items-center gap-2 opacity-40">
            <div className={`w-8 h-px ${templateSlug === 'vintage' ? 'bg-amber-500' : templateSlug === 'elegant' ? 'bg-slate-500' : 'bg-rose-500'}`} />
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
                className={templateSlug === 'vintage' ? 'text-amber-400' : templateSlug === 'elegant' ? 'text-slate-400' : 'text-rose-400'}
              />
            </svg>
            <div className={`w-8 h-px ${templateSlug === 'vintage' ? 'bg-amber-500' : templateSlug === 'elegant' ? 'bg-slate-500' : 'bg-rose-500'}`} />
          </div>
        </div>
      </PageShell>
    </div>
  );
}
