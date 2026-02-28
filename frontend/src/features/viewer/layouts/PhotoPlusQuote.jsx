import PageShell from '../PageShell';
import { PhotoImg, Divider, QuoteBlock } from '../PageShell';

export default function PhotoPlusQuote({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  const heroPhotos = photos.slice(0, Math.min(photos.length, 2));
  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full">
        <div className={`flex items-center justify-center ${heroPhotos.length === 1 ? '' : 'gap-2.5'}`} style={{ height: '58%' }}>
          {heroPhotos.length === 1 ? (
            <div className="w-[85%] h-full"><PhotoImg {...P(0)} heroFrame /></div>
          ) : (
            <>
              <div className="w-[55%] h-full"><PhotoImg {...P(0)} heroFrame /></div>
              <div className="w-[40%] h-[85%] self-end"><PhotoImg {...P(1)} altFrame /></div>
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
          <Divider className={`${style.divider} mb-4`} />
          {page.quote_text && <QuoteBlock text={page.quote_text} style={style} />}
          {page.heading_text && <h3 className={`font-semibold ${style.heading} mt-3 text-center`}>{page.heading_text}</h3>}
          {page.body_text && <p className={`${style.body} text-xs mt-1 text-center line-clamp-2`}>{page.body_text}</p>}
        </div>
      </div>
    </PageShell>
  );
}
