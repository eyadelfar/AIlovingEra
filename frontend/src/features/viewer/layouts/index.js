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

export default LAYOUT_COMPONENTS;
