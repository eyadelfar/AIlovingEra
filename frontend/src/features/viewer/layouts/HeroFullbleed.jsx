import PageShell from '../PageShell';
import { PhotoImg } from '../PageShell';

export default function HeroFullbleed({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  return (
    <PageShell style={style}>
      <div className="absolute inset-0 z-20">
        <div className="absolute inset-x-0 top-0 bottom-[18%]">
          <PhotoImg {...P(0)} heroFrame className="!rounded-none !border-0 !shadow-none !p-0" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[18%] flex flex-col items-center justify-center px-8">
          {page.heading_text && <h3 className={`font-semibold ${style.heading} mb-1 text-center`}>{page.heading_text}</h3>}
          {page.body_text && <p className={`${style.body} text-xs leading-relaxed text-center line-clamp-2`}>{page.body_text}</p>}
          {page.caption_text && <p className={`text-xs ${style.caption} mt-1`}>{page.caption_text}</p>}
        </div>
      </div>
    </PageShell>
  );
}
