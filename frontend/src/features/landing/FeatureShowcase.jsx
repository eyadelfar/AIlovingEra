import { motion } from 'framer-motion';

const features = [
  {
    title: 'AI-Written Narratives',
    description: 'Warm, heartfelt stories crafted by AI that capture the emotion in your photos.',
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    title: '4 Unique Templates',
    description: 'Romantic, Funny, Elegant, or Vintage — each with distinct colors, fonts, and personality.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    title: 'Smart Photo Analysis',
    description: 'AI understands scenes, emotions, and people to create the perfect page layout.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Instant PDF Download',
    description: 'Get a beautifully designed, print-ready PDF memory book in minutes.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    title: 'Voice Story Input',
    description: 'Tell your story by voice — our speech-to-text captures every word.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    title: 'Personalized for You',
    description: 'Add names, occasions, and vibe preferences for a truly custom experience.',
    gradient: 'from-pink-500 to-rose-500',
  },
];

export default function FeatureShowcase() {
  return (
    <section className="py-20 sm:py-28 bg-gray-900/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why You&apos;ll Love It</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Every feature designed to make your memories shine
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-4 opacity-80`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
