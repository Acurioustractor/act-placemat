// Elegant minimal tractor icon
function TractorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 15V11a2 2 0 012-2h6l2 4h2a2 2 0 012 2v2" />
      <path d="M9 9V6a1 1 0 011-1h2a1 1 0 011 1v3" />
      <circle cx="7" cy="17" r="3" />
      <circle cx="17" cy="17" r="2" />
      <path d="M10 17h5" />
    </svg>
  );
}

export function ACTNavigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <a href="https://act.place" className="flex items-center gap-2">
            <TractorIcon className="w-7 h-7 text-gray-900" />
            <span className="text-xl font-bold text-gray-900">
              A Curious Tractor
            </span>
          </a>

          <div className="flex items-center gap-6">
            <a
              href="https://act.place/action"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              The Seeds
            </a>
            <a
              href="https://act.place/seeds"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Germinating
            </a>
            <a
              href="https://act.place/about-new"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              About
            </a>
            <a
              href="https://act.place/blog"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              News
            </a>
            <a
              href="/portfolio"
              className="text-gray-900 font-semibold border-b-2 border-gray-900 pb-1"
            >
              Projects
            </a>
            <a
              href="https://act.place/goods"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Goods
            </a>
            <a
              href="https://act.place/contact"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
