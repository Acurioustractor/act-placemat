import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import InternalLayout from '@/layouts/InternalLayout'

// Internal Pages - Functional, Dashboard, Admin
import InternalDashboard from '@/pages/internal/Dashboard'
import Intelligence from '@/pages/internal/Intelligence'
import ProjectManagement from '@/pages/internal/ProjectManagement'
import DataAnalytics from '@/pages/internal/DataAnalytics'
import UserManagement from '@/pages/internal/UserManagement'
import Settings from '@/pages/internal/Settings'

export default function InternalApp() {
  useEffect(() => {
    // Set internal theme on mount
    document.body.setAttribute('data-theme', 'internal')
    document.body.className = 'internal-app'
  }, [])

  return (
    <InternalLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/internal/dashboard" replace />} />
        <Route path="/dashboard" element={<InternalDashboard />} />
        <Route path="/intelligence" element={<Intelligence />} />
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/analytics" element={<DataAnalytics />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </InternalLayout>
  )
}