export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 1,
    maxPages: 12,
    watermark: true,
    templates: 'basic',
    description: 'Try it out with 1 free book',
    features: ['1 book on signup', '12 pages max', 'Basic templates', 'Watermarked PDF'],
  },
  single_book: {
    id: 'single_book',
    name: 'Single Book',
    price: 299,
    credits: 1,
    maxPages: 50,
    watermark: false,
    templates: 'all',
    description: 'One beautiful memory book',
    features: ['1 book credit', 'Up to 50 pages', 'All templates', 'No watermark', 'HD PDF download'],
  },
  starter_3: {
    id: 'starter_3',
    name: 'Starter Pack',
    price: 499,
    credits: 3,
    maxPages: 50,
    watermark: false,
    templates: 'all',
    description: 'Best value for multiple books',
    features: ['3 book credits', 'Up to 50 pages each', 'All templates', 'No watermark', 'HD PDF download'],
    popular: true,
  },
  creator_10: {
    id: 'creator_10',
    name: 'Creator Pack',
    price: 999,
    credits: 10,
    maxPages: 100,
    watermark: false,
    templates: 'all',
    description: 'For prolific creators',
    features: ['10 book credits', 'Up to 100 pages', 'All templates + premium layouts', 'No watermark', 'Priority generation'],
  },
  monthly_pro: {
    id: 'monthly_pro',
    name: 'Pro Monthly',
    price: 799,
    interval: 'month',
    unlimited: true,
    maxPages: 200,
    watermark: false,
    templates: 'all',
    description: 'Unlimited books, every month',
    features: ['Unlimited books', 'Up to 200 pages', 'All templates & marketplace', 'No watermark', 'Priority generation', 'Early access to new features'],
  },
  annual_pro: {
    id: 'annual_pro',
    name: 'Pro Annual',
    price: 5999,
    interval: 'year',
    unlimited: true,
    maxPages: 200,
    watermark: false,
    templates: 'all',
    description: 'Best price, billed annually',
    features: ['Everything in Pro Monthly', 'Save 37%', 'Billed annually at $59.99/yr'],
    badge: 'Save 37%',
  },
};

export const CREDIT_PLANS = ['single_book', 'starter_3', 'creator_10'];
export const SUBSCRIPTION_PLANS = ['monthly_pro', 'annual_pro'];
export const ONE_TIME_PLANS = ['single_book', 'starter_3', 'creator_10'];

export function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatPriceShort(cents) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export const FEATURE_ROWS = [
  { label: 'Books', free: '1', single: '1', starter: '3', creator: '10', pro: 'Unlimited' },
  { label: 'Max pages', free: '12', single: '50', starter: '50', creator: '100', pro: '200' },
  { label: 'Templates', free: 'Basic (4)', single: 'All', starter: 'All', creator: 'All + Premium', pro: 'All + Premium' },
  { label: 'Watermark-free PDF', free: false, single: true, starter: true, creator: true, pro: true },
  { label: 'Marketplace access', free: false, single: false, starter: false, creator: true, pro: true },
  { label: 'Priority generation', free: false, single: false, starter: false, creator: true, pro: true },
  { label: 'HD PDF download', free: false, single: true, starter: true, creator: true, pro: true },
];
