export function ACTFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-4">A Curious Tractor</h3>
            <p className="text-gray-400 text-sm">
              Building community strength and sovereignty through regenerative projects.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://act.place/action" className="text-gray-400 hover:text-white text-sm transition-colors">
                  The Seeds
                </a>
              </li>
              <li>
                <a href="https://act.place/seeds" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Germinating
                </a>
              </li>
              <li>
                <a href="/portfolio" className="text-white font-medium text-sm">
                  Projects
                </a>
              </li>
              <li>
                <a href="https://act.place/goods" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Goods
                </a>
              </li>
            </ul>
          </div>

          {/* Learn More */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Learn</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://act.place/about-new" className="text-gray-400 hover:text-white text-sm transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="https://act.place/blog" className="text-gray-400 hover:text-white text-sm transition-colors">
                  News
                </a>
              </li>
              <li>
                <a href="https://act.place/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">Connect</h4>
            <p className="text-gray-400 text-sm mb-4">
              Join us in building community strength
            </p>
            <a
              href="https://act.place/contact"
              className="inline-block px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} A Curious Tractor. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
