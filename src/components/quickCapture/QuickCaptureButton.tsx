import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import QuickCaptureModal from './QuickCaptureModal';

/**
 * Floating quick capture button that appears on all pages
 * Provides fast access to create new content
 */
const QuickCaptureButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 group flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-3xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
        aria-label="Quick capture"
        title="Quick Capture"
      >
        <PlusIcon className="h-7 w-7 transition-transform duration-300 group-hover:rotate-90" />
        
        {/* Elegant pulse animation */}
        <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
        
        {/* Subtle inner glow */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-50"></div>
      </button>

      {/* Quick Capture Modal */}
      <QuickCaptureModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default QuickCaptureButton;