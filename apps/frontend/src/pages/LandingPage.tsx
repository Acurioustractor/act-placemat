import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function LandingPage() {
  useEffect(() => {
    // Set theme class on html element for Tailwind dark mode
    document.documentElement.className = 'light'
    document.body.className = 'min-h-screen landing-gradient flex items-center justify-center p-4'
  }, [])

  return (
    <div className="max-w-4xl w-full">
      <div className="text-center">
        <div className="mb-12">
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-white mb-3 drop-shadow-sm">
            ACT Platform
          </h1>
          <p className="text-xl text-white/90 italic">
            Where story meets system
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Link 
            to="/public" 
            className="landing-card landing-card-public group flex flex-col min-h-[320px]"
          >
            <div className="text-4xl mb-4">🌟</div>
            <h3 className="font-display text-2xl font-semibold mb-4 text-green-600 group-hover:text-green-500 transition-colors">
              Public Site
            </h3>
            <p className="text-gray-600 leading-relaxed mb-6 flex-1">
              Elegant, editorial interface for community members and visitors. 
              Showcase projects, stories, and community impact.
            </p>
            <div className="flex flex-col gap-2 text-left">
              <span className="text-sm text-gray-500">• Community Showcase</span>
              <span className="text-sm text-gray-500">• Project Gallery</span>
              <span className="text-sm text-gray-500">• Stories & Impact</span>
              <span className="text-sm text-gray-500">• Public Resources</span>
            </div>
          </Link>
          
          <Link 
            to="/internal" 
            className="landing-card landing-card-internal group flex flex-col min-h-[320px]"
          >
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-display text-2xl font-semibold mb-4 text-blue-600 group-hover:text-blue-500 transition-colors">
              Internal System
            </h3>
            <p className="text-gray-600 leading-relaxed mb-6 flex-1">
              Functional dashboard for admins, project managers, and internal teams.
              Data analysis, project management, and system administration.
            </p>
            <div className="flex flex-col gap-2 text-left">
              <span className="text-sm text-gray-500">• Dashboard Analytics</span>
              <span className="text-sm text-gray-500">• Project Management</span>
              <span className="text-sm text-gray-500">• User Administration</span>
              <span className="text-sm text-gray-500">• Data Intelligence</span>
            </div>
          </Link>
        </div>
        
        <div className="text-center">
          <p className="text-white/80 text-lg">
            Choose your interface based on your role and needs
          </p>
        </div>
      </div>
    </div>
  )
}