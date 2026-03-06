import PageShell from '../PageShell';
import { PhotoImg } from '../PageShell';

export default function HeroFullbleed({ page, style, P }) {
  return (
    <PageShell style={style}>
      <div className="absolute inset-0 z-20">
        <div className="absolute inset-x-0 top-0 bottom-[30%]">
          <PhotoImg {...P(0)} heroFrame className="!rounded-none !border-0 !shadow-none !p-0" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[30%] flex flex-col items-center justify-center px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            {page.heading_text && <h3 data-ts="heading" className={`font-semibold ${style.heading} mb-1 text-center`}>{page.heading_text}</h3>}
            {page.body_text && <p data-ts="body" className={`${style.body} text-xs leading-relaxed text-center line-clamp-4`}>{page.body_text}</p>}
            {page.caption_text && <p data-ts="caption" className={`text-xs ${style.caption} mt-1`}>{page.caption_text}</p>}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
