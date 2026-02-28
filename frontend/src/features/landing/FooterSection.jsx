import Logo from '../shared/Logo';

export default function FooterSection() {
  return (
    <footer className="py-12 border-t border-gray-800/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Logo className="text-lg" />
        <p className="text-gray-500 text-sm mt-3">
          AI-powered memory books for the moments that matter most.
        </p>
        <p className="text-gray-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} Keepsqueak. Made with love and AI.
        </p>
      </div>
    </footer>
  );
}
