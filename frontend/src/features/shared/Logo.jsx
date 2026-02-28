export default function Logo({ className = '' }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="bg-gradient-to-r from-rose-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
        Keep
      </span>
      <span className="text-white">squeak</span>
      <span className="bg-gradient-to-r from-rose-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
        AI
      </span>

    </span>
  );
}
