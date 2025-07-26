import { ReactNode, useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

/**
 * Tabs component for switching between different content sections
 */
const Tabs = ({
  tabs,
  defaultTabId,
  onChange,
  variant = 'default',
  className = '',
}: TabsProps) => {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
    onChange?.(tabId);
  };

  // Variant classes
  const getTabClasses = (tab: Tab) => {
    const isActive = tab.id === activeTabId;
    const isDisabled = tab.disabled;
    
    const baseClasses = 'flex items-center px-4 py-2 text-sm font-medium focus:outline-none transition-colors';
    
    if (isDisabled) {
      return `${baseClasses} text-gray-400 cursor-not-allowed`;
    }
    
    switch (variant) {
      case 'pills':
        return isActive
          ? `${baseClasses} bg-primary-100 text-primary-700 rounded-md`
          : `${baseClasses} text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md`;
      case 'underline':
        return isActive
          ? `${baseClasses} text-primary-600 border-b-2 border-primary-500`
          : `${baseClasses} text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent`;
      default:
        return isActive
          ? `${baseClasses} text-primary-600 border-b-2 border-primary-500`
          : `${baseClasses} text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent`;
    }
  };

  return (
    <div className={className}>
      {/* Tab navigation */}
      <div className={`border-b border-gray-200 ${variant === 'pills' ? 'mb-4' : ''}`}>
        <nav className={`flex space-x-4 ${variant === 'pills' ? 'mb-2' : '-mb-px'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={getTabClasses(tab)}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              disabled={tab.disabled}
              aria-selected={tab.id === activeTabId}
              role="tab"
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tabs.find((tab) => tab.id === activeTabId)?.content}
      </div>
    </div>
  );
};

export default Tabs;