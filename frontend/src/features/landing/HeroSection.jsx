import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function HeroSection() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const previewY = useTransform(scrollYProgress, [0, 1], [0, -30]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      {/* Background gradient with parallax */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-gray-950 to-gray-950" />
      <motion.div style={{ y: bgY }} className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[60vh] max-h-[600px] bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-violet-500/10 blur-3xl rounded-full" />

      <motion.div style={{ y: contentY }} className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block mb-6 px-4 py-1.5 rounded-full text-sm font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
            AI-Powered Memory Books
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
            Turn Your Photos Into{' '}
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              Beautiful Stories
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your favorite moments, and our AI crafts a personalized memory book
            with warm narratives, beautiful layouts, and emotional storytelling.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/create"
              className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-violet-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-rose-600 hover:to-violet-700 transition-all shadow-lg shadow-rose-900/30"
            >
              Create Your Memory Book
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto text-gray-400 hover:text-white px-8 py-4 rounded-xl text-lg font-medium border border-gray-700 hover:border-gray-500 transition-all"
            >
              See How It Works
            </a>
          </div>
        </motion.div>

        {/* Sample book preview with parallax */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ y: previewY }}
          className="mt-16 relative"
        >
          <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
            <div className="aspect-[3/4] bg-gradient-to-br from-rose-900/30 to-violet-900/30 rounded-xl flex items-center justify-center border border-gray-700/30">
              <div className="text-center px-8">
                <p className="text-3xl mb-2">&#10084;&#65039;</p>
                <p className="text-xl font-serif text-rose-200 italic">&ldquo;Our Story&rdquo;</p>
                <p className="text-sm text-gray-400 mt-2">A memory book crafted by AI</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
