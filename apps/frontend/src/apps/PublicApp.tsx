import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import PublicLayout from '@/layouts/PublicLayout'

// Public Pages - Elegant, Editorial, Customer-facing
import PublicOverview from '@/pages/public/PublicOverview'
import CommunityShowcase from '@/pages/public/CommunityShowcase'
import ProjectsGallery from '@/pages/public/ProjectsGallery'
import ProjectProfile from '@/pages/public/ProjectProfile'
import AboutUs from '@/pages/public/AboutUs'
import ContactUs from '@/pages/public/ContactUs'

export default function PublicApp() {
  useEffect(() => {
    // Set public theme on mount
    document.body.setAttribute('data-theme', 'public')
    document.body.className = 'public-app'
  }, [])

  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/public/overview" replace />} />
        <Route path="/overview" element={<PublicOverview />} />
        <Route path="/community" element={<CommunityShowcase />} />
        <Route path="/projects" element={<ProjectsGallery />} />
        <Route path="/projects/:id" element={<ProjectProfile />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
      </Routes>
    </PublicLayout>
  )
}