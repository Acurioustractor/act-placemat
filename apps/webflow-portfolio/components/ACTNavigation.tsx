export function ACTNavigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <a href="https://act.place" className="flex items-center gap-2">
            <span className="text-2xl">🚜</span>
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
