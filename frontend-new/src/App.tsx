import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomepageBeta from './pages/HomepageBeta';
import AboutPage from './pages/AboutPage';
import GoodsProjectPage from './pages/GoodsProjectPage';
import JusticeHubProjectPage from './pages/JusticeHubProjectPage';
import PICCProjectPage from './pages/PICCProjectPage';
import EmpathyLedgerProjectPage from './pages/EmpathyLedgerProjectPage';
import BlogPage from './pages/BlogPage';
import BlogPostDisplay from './pages/BlogPostDisplay';
import UnifiedStoryEditor from './components/StoryEditor/UnifiedStoryEditor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomepageBeta />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/projects/goods" element={<GoodsProjectPage />} />
        <Route path="/projects/justice-hub" element={<JusticeHubProjectPage />} />
        <Route path="/projects/picc" element={<PICCProjectPage />} />
        <Route path="/projects/empathy-ledger" element={<EmpathyLedgerProjectPage />} />
        <Route path="/stories" element={<BlogPage />} />
        <Route path="/stories/new" element={<UnifiedStoryEditor />} />
        <Route path="/stories/:slug" element={<BlogPostDisplay />} />
      </Routes>
    </Router>
  );
}

export default App;