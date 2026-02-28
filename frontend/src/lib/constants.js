export const OCCASIONS = [
  { value: '', label: 'Just Because' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'valentine', label: "Valentine's Day" },
  { value: 'birthday', label: 'Birthday' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'engagement', label: 'Engagement' },
];

export const VIBES = [
  { value: 'romantic_warm', label: 'Romantic & Warm', description: 'Heartfelt, tender, vivid' },
  { value: 'bittersweet_lovely', label: 'Bittersweet & Lovely', description: 'Beautiful nostalgia' },
  { value: 'playful_meme', label: 'Playful & Meme', description: 'Fun, witty, shareable' },
  { value: 'comic_illustrated', label: 'Comic / Illustrated', description: 'Graphic novel style' },
  { value: 'cinematic_poetic', label: 'Cinematic & Poetic', description: 'Lyrical, cinematic' },
  { value: 'minimal_luxury', label: 'Minimal Luxury', description: 'Refined, understated' },
];

export const STRUCTURE_TEMPLATES = [
  { value: 'classic_timeline', label: 'Classic Timeline', description: 'Chronological story from start to now' },
  { value: 'milestones', label: 'Milestones', description: 'Key moments that define your journey' },
  { value: 'trips_adventures', label: 'Trips & Adventures', description: 'Organized by trips and escapes' },
  { value: 'year_in_love', label: 'Year in Love', description: 'Seasonal chapters through the year' },
  { value: 'first_message_to_now', label: 'First Message to Now', description: 'From first DM to today' },
  { value: 'inside_jokes_quotes', label: 'Inside Jokes & Quotes', description: 'Phrases and jokes that define you' },
  { value: 'letters_to_you', label: 'Letters to You', description: 'Heartfelt letters to your partner' },
  { value: 'scrapbook_collage', label: 'Scrapbook Collage', description: 'Freeform personality-packed collage' },
  { value: 'comic_highlights', label: 'Comic Highlights', description: 'Love story as comic episodes' },
];

export const LAYOUT_TYPES = [
  { value: 'HERO_FULLBLEED', label: 'Hero', description: '1 photo, full page', group: 'photo' },
  { value: 'TWO_BALANCED', label: '2 Photos', description: 'Side-by-side', group: 'photo' },
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

export const IMAGE_LOOKS = [
  { value: 'natural', label: 'Natural', description: 'Keep photos as-is' },
  { value: 'film', label: 'Film', description: 'Kodak Portra 400 aesthetic' },
  { value: 'vintage', label: 'Vintage', description: 'Warm sepia tones' },
  { value: 'bright_airy', label: 'Bright & Airy', description: 'Soft highlights, pastel' },
  { value: 'moody', label: 'Moody', description: 'Deep shadows, cool tones' },
  { value: 'bw', label: 'B&W', description: 'Elegant black and white' },
  { value: 'comic_ink', label: 'Comic Ink', description: 'Bold comic book style' },
  { value: 'watercolor', label: 'Watercolor', description: 'Soft painted look' },
];

export const PAGE_SIZES = [
  { value: 'a4', label: 'A4', description: '210 x 297 mm' },
  { value: 'us_letter', label: 'US Letter', description: '8.5 x 11 in' },
  { value: 'square', label: 'Square', description: '8.5 x 8.5 in' },
];

/** Tailwind aspect-ratio class per page size */
export const PAGE_ASPECT = {
  a4: 'aspect-[3/4]',
  us_letter: 'aspect-[3/4]',
  square: 'aspect-square',
};

// Default photo look per template — selecting a template auto-sets this
export const TEMPLATE_DEFAULTS = {
  romantic: { imageLook: 'natural' },
  vintage: { imageLook: 'vintage' },
  elegant: { imageLook: 'bw' },
  meme_funny: { imageLook: 'natural' },
};

export const ADD_ONS = [
  { key: 'loveLetter', label: 'Love Letter Insert', description: 'AI writes a heartfelt love letter to include' },
  { key: 'audioQrCodes', label: 'Audio QR Codes', description: 'QR codes linking to spoken chapter narrations' },
  { key: 'anniversaryCover', label: 'Anniversary Edition Cover', description: 'Special edition cover with anniversary tagline' },
  { key: 'miniReel', label: 'Mini Reel Storyboard', description: 'Scene-by-scene storyboard for a short video' },
];

export const IMAGE_DENSITIES = [
  { value: 'dense', label: 'Dense', description: 'Up to 3 photos per page', icon: 'grid' },
  { value: 'balanced', label: 'Balanced', description: '1-2 photos per page', icon: 'stack' },
  { value: 'airy', label: 'Airy', description: '1 per page, generous whitespace', icon: 'frame' },
];

export const WIZARD_STEPS = [
  { label: 'Setup', icon: 'palette' },
  { label: 'Photos', icon: 'camera' },
  { label: 'Your Story', icon: 'pen' },
  { label: 'Generate', icon: 'sparkles' },
];
