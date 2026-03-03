import HeroFullbleed from './HeroFullbleed';
import TwoBalanced from './TwoBalanced';
import ThreeGrid from './ThreeGrid';
import FourGrid from './FourGrid';
import SixMontage from './SixMontage';
import Wall from './Wall';
import PhotoPlusQuote from './PhotoPlusQuote';
import CollagePlusLetter from './CollagePlusLetter';

/** Layout registry — maps layout_type string to React component */
const LAYOUT_COMPONENTS = {
  HERO_FULLBLEED: HeroFullbleed,
  TWO_BALANCED: TwoBalanced,
  THREE_GRID: ThreeGrid,
  FOUR_GRID: FourGrid,
  SIX_MONTAGE: SixMontage,
  WALL_8_10: Wall,
  PHOTO_PLUS_QUOTE: PhotoPlusQuote,
  COLLAGE_PLUS_LETTER: CollagePlusLetter,
};

/** Maximum number of photos each layout can display */
export const MAX_PHOTOS = {
  HERO_FULLBLEED: 1,
  TWO_BALANCED: 2,
  THREE_GRID: 3,
  FOUR_GRID: 4,
  SIX_MONTAGE: 6,
  WALL_8_10: 10,
  PHOTO_PLUS_QUOTE: 2,
  COLLAGE_PLUS_LETTER: 9,
  QUOTE_PAGE: 0,
  DEDICATION: 0,
  TOC_SIMPLE: 0,
};

/** Ordered list for auto-upgrading layouts when adding photos */
const LAYOUT_UPGRADE_ORDER = [
  'HERO_FULLBLEED',
  'TWO_BALANCED',
  'PHOTO_PLUS_QUOTE',
  'THREE_GRID',
  'FOUR_GRID',
  'SIX_MONTAGE',
  'COLLAGE_PLUS_LETTER',
  'WALL_8_10',
];

/** Get the next layout type that can hold more photos than the current one */
export function getNextLayoutUp(currentLayout) {
  const currentMax = MAX_PHOTOS[currentLayout] || 1;
  for (const layout of LAYOUT_UPGRADE_ORDER) {
    if ((MAX_PHOTOS[layout] || 0) > currentMax) return layout;
  }
  return null;
}

export default LAYOUT_COMPONENTS;
