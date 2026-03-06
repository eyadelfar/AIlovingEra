export interface Occasion {
  value: string;
  label: string;
  i18nLabel: string;
}

export interface Vibe {
  value: string;
  label: string;
  description: string;
  i18nLabel: string;
  i18nDesc: string;
}

export interface StructureTemplate {
  value: string;
  label: string;
  description: string;
  i18nLabel: string;
  i18nDesc: string;
}

export interface LayoutType {
  value: string;
  label: string;
  description: string;
  group: 'photo' | 'mixed' | 'text';
}

export interface ImageLook {
  value: string;
  label: string;
  description: string;
  i18nLabel: string;
  i18nDesc: string;
}

export interface PageSize {
  value: string;
  label: string;
  description: string;
  i18nLabel: string;
  i18nDesc: string;
}

export interface ImageDensity {
  value: string;
  label: string;
  description: string;
  icon: string;
  i18nLabel: string;
  i18nDesc: string;
}

export interface WizardStep {
  label: string;
  icon: string;
  i18nLabel: string;
}

export interface AddOn {
  key: string;
  label: string;
  description: string;
  i18nLabel: string;
  i18nDesc: string;
}

export const OCCASIONS: readonly Occasion[] = [
  { value: '', label: 'Just Because', i18nLabel: 'occasionJustBecause' },
  { value: 'anniversary', label: 'Anniversary', i18nLabel: 'occasionAnniversary' },
  { value: 'valentine', label: "Valentine's Day", i18nLabel: 'occasionValentine' },
  { value: 'birthday', label: 'Birthday', i18nLabel: 'occasionBirthday' },
  { value: 'wedding', label: 'Wedding', i18nLabel: 'occasionWedding' },
  { value: 'engagement', label: 'Engagement', i18nLabel: 'occasionEngagement' },
];

export const VIBES: readonly Vibe[] = [
  { value: 'romantic_warm', label: 'Romantic & Warm', description: 'Heartfelt, tender, vivid', i18nLabel: 'vibeRomanticWarm', i18nDesc: 'vibeRomanticWarmDesc' },
  { value: 'bittersweet_lovely', label: 'Bittersweet & Lovely', description: 'Beautiful nostalgia', i18nLabel: 'vibeBittersweetLovely', i18nDesc: 'vibeBittersweetLovelyDesc' },
  { value: 'playful_meme', label: 'Playful & Meme', description: 'Fun, witty, shareable', i18nLabel: 'vibePlayfulMeme', i18nDesc: 'vibePlayfulMemeDesc' },
  { value: 'comic_illustrated', label: 'Comic / Illustrated', description: 'Graphic novel style', i18nLabel: 'vibeComicIllustrated', i18nDesc: 'vibeComicIllustratedDesc' },
  { value: 'cinematic_poetic', label: 'Cinematic & Poetic', description: 'Lyrical, cinematic', i18nLabel: 'vibeCinematicPoetic', i18nDesc: 'vibeCinematicPoeticDesc' },
  { value: 'minimal_luxury', label: 'Minimal Luxury', description: 'Refined, understated', i18nLabel: 'vibeMinimalLuxury', i18nDesc: 'vibeMinimalLuxuryDesc' },
];

export const STRUCTURE_TEMPLATES: readonly StructureTemplate[] = [
  { value: 'classic_timeline', label: 'Classic Timeline', description: 'Chronological story from start to now', i18nLabel: 'structureClassicTimeline', i18nDesc: 'structureClassicTimelineDesc' },
  { value: 'milestones', label: 'Milestones', description: 'Key moments that define your journey', i18nLabel: 'structureMilestones', i18nDesc: 'structureMilestonesDesc' },
  { value: 'trips_adventures', label: 'Trips & Adventures', description: 'Organized by trips and escapes', i18nLabel: 'structureTripsAdventures', i18nDesc: 'structureTripsAdventuresDesc' },
  { value: 'year_in_love', label: 'Year in Love', description: 'Seasonal chapters through the year', i18nLabel: 'structureYearInLove', i18nDesc: 'structureYearInLoveDesc' },
  { value: 'first_message_to_now', label: 'First Message to Now', description: 'From first DM to today', i18nLabel: 'structureFirstMessageToNow', i18nDesc: 'structureFirstMessageToNowDesc' },
  { value: 'inside_jokes_quotes', label: 'Inside Jokes & Quotes', description: 'Phrases and jokes that define you', i18nLabel: 'structureInsideJokesQuotes', i18nDesc: 'structureInsideJokesQuotesDesc' },
  { value: 'letters_to_you', label: 'Letters to You', description: 'Heartfelt letters to your partner', i18nLabel: 'structureLettersToYou', i18nDesc: 'structureLettersToYouDesc' },
  { value: 'scrapbook_collage', label: 'Scrapbook Collage', description: 'Freeform personality-packed collage', i18nLabel: 'structureScrapbookCollage', i18nDesc: 'structureScrapbookCollageDesc' },
  { value: 'comic_highlights', label: 'Comic Highlights', description: 'Love story as comic episodes', i18nLabel: 'structureComicHighlights', i18nDesc: 'structureComicHighlightsDesc' },
];

export const LAYOUT_TYPES: readonly LayoutType[] = [
  { value: 'HERO_FULLBLEED', label: 'Hero', description: '1 photo, full page', group: 'photo' },
  { value: 'THREE_GRID', label: '3 Grid', description: '3 photos in grid', group: 'photo' },
  { value: 'FOUR_GRID', label: '4 Grid', description: '2x2 grid', group: 'photo' },
  { value: 'SIX_MONTAGE', label: '6 Montage', description: 'Dense montage', group: 'photo' },
  { value: 'WALL_8_10', label: 'Photo Wall', description: '8-10 tiny images', group: 'photo' },
  { value: 'PHOTO_PLUS_QUOTE', label: 'Photo + Quote', description: 'Images + large quote', group: 'mixed' },
  { value: 'COLLAGE_PLUS_LETTER', label: 'Collage + Letter', description: 'Collage + long text', group: 'mixed' },
  { value: 'QUOTE_PAGE', label: 'Quote Page', description: 'Large quote, breathing room', group: 'text' },
  { value: 'DEDICATION', label: 'Dedication', description: 'Dedication page', group: 'text' },
  { value: 'TOC_SIMPLE', label: 'Table of Contents', description: 'Chapter listing', group: 'text' },
];

export const MAX_IMAGES = 250;
export const MIN_IMAGES = 1;

export const IMAGE_LOOKS: readonly ImageLook[] = [
  { value: 'natural', label: 'Natural', description: 'Keep photos as-is', i18nLabel: 'lookNatural', i18nDesc: 'lookNaturalDesc' },
  { value: 'film', label: 'Film', description: 'Kodak Portra 400 aesthetic', i18nLabel: 'lookFilm', i18nDesc: 'lookFilmDesc' },
  { value: 'vintage', label: 'Vintage', description: 'Warm sepia tones', i18nLabel: 'lookVintage', i18nDesc: 'lookVintageDesc' },
  { value: 'bright_airy', label: 'Bright & Airy', description: 'Soft highlights, pastel', i18nLabel: 'lookBrightAiry', i18nDesc: 'lookBrightAiryDesc' },
  { value: 'moody', label: 'Moody', description: 'Deep shadows, cool tones', i18nLabel: 'lookMoody', i18nDesc: 'lookMoodyDesc' },
  { value: 'bw', label: 'B&W', description: 'Elegant black and white', i18nLabel: 'lookBW', i18nDesc: 'lookBWDesc' },
  { value: 'comic_ink', label: 'Comic Ink', description: 'Bold comic book style', i18nLabel: 'lookComicInk', i18nDesc: 'lookComicInkDesc' },
  { value: 'watercolor', label: 'Watercolor', description: 'Soft painted look', i18nLabel: 'lookWatercolor', i18nDesc: 'lookWatercolorDesc' },
];

export const PAGE_SIZES: readonly PageSize[] = [
  { value: 'a4', label: 'A4', description: '210 x 297 mm', i18nLabel: 'pageSizeA4', i18nDesc: 'pageSizeA4Desc' },
  { value: 'us_letter', label: 'US Letter', description: '8.5 x 11 in', i18nLabel: 'pageSizeUSLetter', i18nDesc: 'pageSizeUSLetterDesc' },
  { value: 'square', label: 'Square', description: '8.5 x 8.5 in', i18nLabel: 'pageSizeSquare', i18nDesc: 'pageSizeSquareDesc' },
  { value: 'custom', label: 'Custom', description: 'Set your own size', i18nLabel: 'pageSizeCustom', i18nDesc: 'pageSizeCustomDesc' },
];

export const PAGE_ASPECT: Record<string, string> = {
  a4: 'aspect-[3/4]',
  us_letter: 'aspect-[3/4]',
  square: 'aspect-square',
};

export function getPageAspect(pageSize: string): string {
  return PAGE_ASPECT[pageSize] || 'aspect-[3/4]';
}

export const TEMPLATE_DEFAULTS: Record<string, { imageLook: string }> = {
  romantic: { imageLook: 'natural' },
  vintage: { imageLook: 'vintage' },
  elegant: { imageLook: 'bw' },
  meme_funny: { imageLook: 'natural' },
};

export const VIBE_IMAGE_LOOK_DEFAULTS: Record<string, string> = {
  romantic_warm: 'natural',
  bittersweet_lovely: 'vintage',
  playful_meme: 'bright_airy',
  comic_illustrated: 'comic_ink',
  cinematic_poetic: 'moody',
  minimal_luxury: 'bw',
};

export function estimatePageCount(numPhotos: number): number {
  return Math.min(200, Math.max(8, Math.round(numPhotos * 1.2)) + 4);
}

export const ADD_ONS: readonly AddOn[] = [
  { key: 'loveLetter', label: 'Love Letter Insert', description: 'AI writes a heartfelt love letter to include', i18nLabel: 'addOnLoveLetter', i18nDesc: 'addOnLoveLetterDesc' },
  { key: 'audioQrCodes', label: 'Audio QR Codes', description: 'QR codes linking to spoken chapter narrations', i18nLabel: 'addOnAudioQrCodes', i18nDesc: 'addOnAudioQrCodesDesc' },
  { key: 'anniversaryCover', label: 'Anniversary Edition Cover', description: 'Special edition cover with anniversary tagline', i18nLabel: 'addOnAnniversaryCover', i18nDesc: 'addOnAnniversaryCoverDesc' },
  { key: 'miniReel', label: 'Mini Reel Storyboard', description: 'Scene-by-scene storyboard for a short video', i18nLabel: 'addOnMiniReel', i18nDesc: 'addOnMiniReelDesc' },
];

export const FREE_PREVIEW_PAGES = 3;

export function isPageLocked(pageIndex: number, previewOnly: boolean): boolean {
  if (!previewOnly) return false;
  return pageIndex >= FREE_PREVIEW_PAGES;
}

export const IMAGE_DENSITIES: readonly ImageDensity[] = [
  { value: 'dense', label: 'Dense', description: 'Up to 3 photos per page', icon: 'grid', i18nLabel: 'densityDense', i18nDesc: 'densityDenseDesc' },
  { value: 'balanced', label: 'Balanced', description: '1-2 photos per page', icon: 'stack', i18nLabel: 'densityBalanced', i18nDesc: 'densityBalancedDesc' },
  { value: 'airy', label: 'Airy', description: '1 per page, generous whitespace', icon: 'frame', i18nLabel: 'densityAiry', i18nDesc: 'densityAiryDesc' },
  { value: 'custom', label: 'Custom', description: 'Set your own count', icon: 'custom', i18nLabel: 'densityCustom', i18nDesc: 'densityCustomDesc' },
];

export const WIZARD_STEPS: readonly WizardStep[] = [
  { label: 'Setup', icon: 'palette', i18nLabel: 'stepSetup' },
  { label: 'Photos', icon: 'camera', i18nLabel: 'stepPhotos' },
  { label: 'Your Story', icon: 'pen', i18nLabel: 'stepYourStory' },
  { label: 'Generate', icon: 'sparkles', i18nLabel: 'stepGenerate' },
];
