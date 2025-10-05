---
title: Research Session
query: "Modern UI/UX patterns for contact management applications - contact tables, filtering, search, professional styling with React and Tailwind CSS"
date: 9/13/2025
time: 5:58:26 PM
timestamp: 2025-09-13T07:58:26.694Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Modern UI/UX patterns for contact management applications - contact tables, filtering, search, professional styling with React and Tailwind CSS

**Response:**

# Modern UI/UX Patterns for Contact Management Applications

## Introduction to Contact Management UI/UX

Contact management systems form a critical component of many business applications, particularly those focused on community management, relationship tracking, and user administration. Based on the project context provided, your application involves managing communities, partnerships, and user permissions with various roles (Community, Partner, Admin). Implementing an effective contact management interface will be essential for tasks like Task 12 (Authentication System with Role-Based Permissions), Task 16 (Story Management with Consent Tracking), and Task 19 (Community Data Control Tools).

Modern contact management interfaces have evolved significantly beyond simple lists, incorporating sophisticated filtering, search capabilities, and intuitive interaction patterns. This research explores comprehensive UI/UX patterns specifically for contact management within React and Tailwind CSS frameworks, with practical implementation guidance tailored to your project requirements.

## Table-Based Contact Management Patterns

### 1. Responsive Table Architecture

Modern contact tables must be responsive across devices while maintaining data density and usability. Here are the key patterns:

**Horizontally Scrollable Tables with Fixed Columns:**
```jsx
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        {/* Fixed columns stay visible during horizontal scroll */}
        <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Name
        </th>
        {/* Other columns */}
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Role
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Community
        </th>
        {/* More columns */}
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {contacts.map((contact) => (
        <tr key={contact.id}>
          <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <div className="h-10 w-10 flex-shrink-0">
                <img className="h-10 w-10 rounded-full" src={contact.avatar} alt="" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                <div className="text-sm text-gray-500">{contact.email}</div>
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.role}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.community}</td>
          {/* More cells */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Responsive Column Visibility:**
For smaller screens, implement column priority to show only the most important data:

```jsx
// Column visibility based on screen size
const columns = [
  { id: 'name', name: 'Name', priority: 'high' },
  { id: 'role', name: 'Role', priority: 'high' },
  { id: 'email', name: 'Email', priority: 'medium' },
  { id: 'community', name: 'Community', priority: 'medium' },
  { id: 'lastActive', name: 'Last Active', priority: 'low' },
  { id: 'consentStatus', name: 'Consent Status', priority: 'low' },
];

// In your JSX
{columns.map(column => (
  <th 
    key={column.id}
    className={`
      px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
      ${column.priority === 'low' ? 'hidden lg:table-cell' : ''}
      ${column.priority === 'medium' ? 'hidden md:table-cell' : ''}
    `}
  >
    {column.name}
  </th>
))}
```

### 2. Advanced Table Interactions

Modern contact tables incorporate several interaction patterns that enhance usability:

**Row Selection with Batch Actions:**
```jsx
const [selectedContacts, setSelectedContacts] = useState([]);

// In your table
<thead>
  <tr>
    <th className="px-6 py-3">
      <input
        type="checkbox"
        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        checked={selectedContacts.length === contacts.length}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedContacts(contacts.map(c => c.id));
          } else {
            setSelectedContacts([]);
          }
        }}
      />
    </th>
    {/* Other headers */}
  </tr>
</thead>
<tbody>
  {contacts.map(contact => (
    <tr key={contact.id}>
      <td className="px-6 py-4">
        <input
          type="checkbox"
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          checked={selectedContacts.includes(contact.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedContacts([...selectedContacts, contact.id]);
            } else {
              setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
            }
          }}
        />
      </td>
      {/* Other cells */}
    </tr>
  ))}
</tbody>

{/* Batch action toolbar - appears when items are selected */}
{selectedContacts.length > 0 && (
  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
    <div className="flex-1 flex justify-between sm:hidden">
      <span className="text-sm text-gray-700">
        {selectedContacts.length} selected
      </span>
    </div>
    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-gray-700">
          <span className="font-medium">{selectedContacts.length}</span> contacts selected
        </p>
      </div>
      <div>
        <button
          type="button"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => handleBatchAction('tag')}
        >
          Tag
        </button>
        <button
          type="button"
          className="ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => handleBatchAction('export')}
        >
          Export
        </button>
        <button
          type="button"
          className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          onClick={() => handleBatchAction('delete')}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
```

**Inline Editing:**
For quick edits without leaving the table view:

```jsx
const [editingId, setEditingId] = useState(null);
const [editValue, setEditValue] = useState('');

// In your table row
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {editingId === contact.id ? (
    <input
      type="text"
      className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => {
        updateContact(contact.id, { role: editValue });
        setEditingId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          updateContact(contact.id, { role: editValue });
          setEditingId(null);
        } else if (e.key === 'Escape') {
          setEditingId(null);
        }
      }}
      autoFocus
    />
  ) : (
    <span
      onClick={() => {
        setEditingId(contact.id);
        setEditValue(contact.role);
      }}
      className="cursor-pointer hover:text-indigo-600"
    >
      {contact.role}
    </span>
  )}
</td>
```

**Row Expansion for Details:**
Expand rows to show additional information without navigating away:

```jsx
const [expandedRows, setExpandedRows] = useState(new Set());

const toggleRowExpansion = (id) => {
  const newExpandedRows = new Set(expandedRows);
  if (newExpandedRows.has(id)) {
    newExpandedRows.delete(id);
  } else {
    newExpandedRows.add(id);
  }
  setExpandedRows(newExpandedRows);
};

// In your table
{contacts.map(contact => (
  <React.Fragment key={contact.id}>
    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggleRowExpansion(contact.id)}>
      <td className="px-6 py-4">
        <button className="text-gray-400 hover:text-gray-500">
          {expandedRows.has(contact.id) ? (
            <ChevronDownIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </td>
      {/* Other cells */}
    </tr>
    {expandedRows.has(contact.id) && (
      <tr className="bg-gray-50">
        <td colSpan={columns.length + 1} className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Contact Details</h4>
              <p className="mt-1 text-sm text-gray-500">Phone: {contact.phone}</p>
              <p className="mt-1 text-sm text-gray-500">Address: {contact.address}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Consent Status</h4>
              <p className="mt-1 text-sm text-gray-500">Last Updated: {contact.consentUpdated}</p>
              <p className="mt-1 text-sm text-gray-500">Status: {contact.consentStatus}</p>
            </div>
            {/* Additional details sections */}
          </div>
        </td>
      </tr>
    )}
  </React.Fragment>
))}
```

## Advanced Filtering and Search Patterns

### 1. Multi-Faceted Search System

Modern contact management requires sophisticated search capabilities beyond simple text matching:

**Combined Search Bar with Filters:**
```jsx
const [searchTerm, setSearchTerm] = useState('');
const [activeFilters, setActiveFilters] = useState({
  role: [],
  community: [],
  consentStatus: [],
});

// Search bar with filter dropdown
<div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
  <div className="relative flex-grow">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
    </div>
    <input
      type="text"
      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      placeholder="Search contacts..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
  
  <Menu as="div" className="relative inline-block text-left">
    <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
      Filters
      <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
    </Menu.Button>

    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10">
        <div className="py-1 px-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</h3>
          <div className="mt-2 space-y-1">
            {['Community', 'Partner', 'Admin'].map((role) => (
              <div key={role} className="flex items-center">
                <input
                  id={`role-${role}`}
                  name={`role-${role}`}
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={activeFilters.role.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setActiveFilters({
                        ...activeFilters,
                        role: [...activeFilters.role, role]
                      });
                    } else {
                      setActiveFilters({
                        ...activeFilters,
                        role: activeFilters.role.filter(r => r !== role)
                      });
                    }
                  }}
                />
                <label htmlFor={`role-${role}`} className="ml-3 text-sm text-gray-600">
                  {role}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Additional filter sections */}
        <div className="py-1 px-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consent Status</h3>
          {/* Consent status filters */}
        </div>
        
        <div className="py-1 px-3">
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            onClick={() => setActiveFilters({ role: [], community: [], consentStatus: [] })}
          >
            Clear all filters
          </button>
        </div>
      </Menu.Items>
    </Transition>
  </Menu>
</div>

{/* Active filters display */}
{(activeFilters.role.length > 0 || activeFilters.community.length > 0 || activeFilters.consentStatus.length > 0) && (
  <div className="mt-2 flex flex-wrap items-center space-x-2">
    <span className="text-sm text-gray-700">Active filters:</span>
    {activeFilters.role.map(role => (
      <span key={`role-${role}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
        Role: {role}
        <button
          type="button"
          className="ml-1 inline-flex flex-shrink-0 h-4 w-4 rounded-full items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
          onClick={() => {
            setActiveFilters({
              ...activeFilters,
              role: activeFilters.role.filter(r => r !== role)
            });
          }}
        >
          <span className="sr-only">Remove filter for {role}</span>
          <XIcon className="h-2 w-2" aria-hidden="true" />
        </button>
      </span>
    ))}
    {/* Similar tags for other active filters */}
  </div>
)}
```

**Advanced Search Syntax Support:**
Implement a parser for advanced search queries:

```jsx
const parseSearchQuery = (query) => {
  const filters = { text: '', role: null, community: null, consent: null };
  
  // Extract specific filters using regex
  const roleMatch = query.match(/role:([^\s]+)/);
  if (roleMatch) {
    filters.role = roleMatch[1];
    query = query.replace(roleMatch[0], '');
  }
  
  const communityMatch = query.match(/community:([^\s]+)/);
  if (communityMatch) {
    filters.community = communityMatch[1];
    query = query.replace(communityMatch[0], '');
  }
  
  const consentMatch = query.match(/consent:([^\s]+)/);
  if (consentMatch) {
    filters.consent = consentMatch[1];
    query = query.replace(consentMatch[0], '');
  }
  
  // Remaining text is the general search term
  filters.text = query.trim();
  
  return filters;
};

// Usage in filtering
const filterContacts = (contacts, searchTerm, activeFilters) => {
  if (!searchTerm && Object.values(activeFilters).every(filter => filter.length === 0)) {
    return contacts;
  }
  
  let filtered = [...contacts];
  
  // Apply parsed search query
  if (searchTerm) {
    const parsedSearch = parseSearchQuery(searchTerm);
    
    if (parsedSearch.text) {
      const searchLower = parsedSearch.text.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower)
      );
    }
    
    if (parsedSearch.role) {
      filtered = filtered.filter(contact => 
        contact.role.toLowerCase() === parsedSearch.role.toLowerCase()
      );
    }
    
    if (parsedSearch.community) {
      filtered = filtered.filter(contact => 
        contact.community.toLowerCase().includes(parsedSearch.community.toLowerCase())
      );
    }
    
    if (parsedSearch.consent) {
      filtered = filtered.filter(contact => 
        contact.consentStatus.toLowerCase() === parsedSearch.consent.toLowerCase()
      );
    }
  }
  
  // Apply active filters
  if (activeFilters.role.length > 0) {
    filtered = filtered.filter(contact => activeFilters.role.includes(contact.role));
  }
  
  if (activeFilters.community.length > 0) {
    filtered = filtered.filter(contact => activeFilters.community.includes(contact.community));
  }
  
  if (activeFilters.consentStatus.length > 0) {
    filtered = filtered.filter(contact => activeFilters.consentStatus.includes(contact.consentStatus));
  }
  
  return filtered;
};
```

### 2. Dynamic Filter UI Patterns

**Filter Chips with Quick Removal:**
```jsx
const FilterChip = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
    {label}: {value}
    <button
      type="button"
      className="ml-1 inline-flex flex-shrink-0 h-4 w-4 rounded-full items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
      onClick={onRemove}
    >
      <span className="sr-only">Remove filter for {value}</span>
      <XIcon className="h-2 w-2" aria-hidden="true" />
    </button>
  </span>
);

// Usage
<div className="flex flex-wrap gap-2 mt-2">
  {activeFilters.role.map(role => (
    <FilterChip 
      key={`role-${role}`} 
      label="Role" 
      value={role} 
      onRemove={() => removeFilter('role', role)} 
    />
  ))}
  {/* Other filter chips */}
</div>
```

**Saved Filters:**
Allow users to save and reuse common filter combinations:

```jsx
const [savedFilters, setSavedFilters] = useState([
  { id: 1, name: 'Active Admins', filters: { role: ['Admin'], status: ['Active'] } },
  { id: 2, name: 'Pending Consent', filters: { consentStatus: ['Pending'] } },
]);

// Saved filters dropdown
<Menu as="div" className="relative inline-block text-left">
  <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
    Saved Filters
    <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
  </Menu.Button>

  <Transition
    as={Fragment}
    enter="transition ease-out duration-100"
    enterFrom="transform opacity-0 scale-95"
    enterTo="transform opacity-100 scale-100"
    leave="transition ease-in duration-75"
    leaveFrom="transform opacity-100 scale-100"
    leaveTo="transform opacity-0 scale-95"
  >
    <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10">
      <div className="py-1">
        {savedFilters.map((filter) => (
          <Menu.Item key={filter.id}>
            {({ active }) => (
              <button
                onClick={() => setActiveFilters(filter.filters)}
                className={`${
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                } group flex items-center w-full px-4 py-2 text-sm`}
              >
                {filter.name}
              </button>
            )}
          </Menu.Item>
        ))}
      </div>
      <div className="py-1">
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={() => saveCurrentFilters()}
              className={`${
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              } group flex items-center w-full px-4 py-2 text-sm`}
            >
              <SaveIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
              Save current filters
            </button>
          )}
        </Menu.Item>
      </div>
    </Menu.Items>
  </Transition>
</Menu>
```

## Professional Styling with Tailwind CSS

### 1. Consistent Design System

Create a cohesive design system for your contact management interface:

**Color System for Status Indicators:**
```jsx
// Define a status badge component with appropriate colors
const StatusBadge = ({ status }) => {
  const statusStyles = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    revoked: "bg-red-100 text-red-800",
    expired: "bg-orange-100 text-orange-800",
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

// Usage in table
<td className="px-6 py-4 whitespace-nowrap">
  <StatusBadge status={contact.consentStatus} />
</td>
```

**Consistent Spacing and Typography:**
```jsx
// Create a custom Tailwind plugin for your design system
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
      spacing: {
        // Custom spacing values if needed
      },
      colors: {
        // Your brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... other shades
          600: '#0284c7',
          700: '#0369a1',
        },
        // ... other color definitions
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    // Custom plugin for consistent table styling
    plugin(function({ addComponents }) {
      const tables = {
        '.data-table': {
          '@apply min-w-full divide-y divide-gray-200': {},
          'th': {
            '@apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider': {},
          },
          'td': {
            '@apply px-6 py-4 whitespace-nowrap text-sm text-gray-500': {},
          },
          'tbody tr': {
            '@apply bg-white even:bg-gray-50': {},
          },
          'tbody tr:hover': {
            '@apply bg-gray-50': {},
          },
        }
      };
      
      addComponents(tables);
    }),
  ],
};
```

### 2. Skeleton Loading States

Implement skeleton loading states for a polished user experience:

```jsx
const ContactTableSkeleton = () => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Name
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Role
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Community
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {Array(5).fill().map((_, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="ml-4">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-48 bg-gray-100 rounded mt-2 animate-pulse"></div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Usage
{isLoading ? <ContactTableSkeleton /> : <ContactTable contacts={contacts} />}
```

### 3. Empty States and Error Handling

Create visually appealing empty states and error handling:

```jsx
const EmptyContactsState = ({ onAddNew }) => (
  <div className="text-center py-12">
    <svg
      className="mx-auto h-12 w-12 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
    <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
    <p className="mt-1 text-sm text-gray-500">
      Get started by adding your first contact.
    </p>
    <div className="mt-6">
      <button
        type="button"
        onClick={onAddNew}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        Add Contact
      </button>
    </div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="text-center py-12">
    <svg
      className="mx-auto h-12 w-12 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading contacts</h3>
    <p className="mt-1 text-sm text-gray-500">
      {error || "There was an error loading your contacts. Please try again."}
    </p>
    <div className="mt-6">
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <RefreshIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        Retry
      </button>
    </div>
  </div>
);

// Usage
{error ? (
  <ErrorState error={error} onRetry={fetchContacts} />
) : contacts.length === 0 ? (
  <EmptyContactsState onAddNew={() => setShowAddModal(true)} />
) : (
  <ContactTable contacts={contacts} />
)}
```

## Integration with Project Requirements

Based on your project context, here are specific recommendations for integrating these contact management patterns:

### 1. Role-Based Contact Management (Task 12)

Implement role-based visibility and actions in your contact table:

```jsx
// Component that shows different actions based on user role
const ContactActions = ({ contact, userRole }) => {
  // Define permissions based on user role
  const canEdit = userRole === 'Admin' || 
                 (userRole === 'Partner' && contact.role !== 'Admin') ||
                 (userRole === 'Community' && contact.id === currentUserId);
                 
  const canDelete = userRole === 'Admin';
  const canManageConsent = userRole === 'Admin' || userRole === 'Partner';

  return (
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <div className="flex justify-end space-x-2">
        {canEdit && (
          <button
            onClick={() => handleEdit(contact.id)}
            className="text-indigo-600 hover:text-indigo-900"
          >
            Edit
          </button>
        )}
        
        {canManageConsent && (
          <button
            onClick={() => handleConsentManagement(contact.id)}
            className="text-green-600 hover:text-green-900"
          >
            Manage Consent
          </button>
        )}
        
        {canDelete && (
          <button
            onClick={() => handleDelete(contact.id)}
            className="text-red-600 hover:text-red-900"
          >
            Delete
          </button>
        )}
      </div>
    </td>
  );
};
```

### 2. Consent Tracking Integration (Task 16)

Add consent tracking indicators and management to your contact table:

```jsx
// Consent status component with expiration warning
const ConsentStatus = ({ status, expirationDate }) => {
  const now = new Date();
  const expiration = new Date(expirationDate);
  const daysUntilExpiration = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
  
  let statusClass = "bg-gray-100 text-gray-800";
  
  if (status === 'Approved') {
    statusClass = "bg-green-100 text-green-800";
    if (daysUntilExpiration <= 30) {
      statusClass = "bg-yellow-100 text-yellow-800";
    }
  } else if (status === 'Pending') {
    statusClass = "bg-yellow-100 text-yellow-800";
  } else if (status === 'Denied' || status === 'Revoked') {
    statusClass = "bg-red-100 text-red-800";
  } else if (status === 'Expired') {
    statusClass = "bg-orange-100 text-orange-800";
  }
  
  return (
    <div>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
        {status}
      </span>
      {status === 'Approved' && daysUntilExpiration <= 30 && (
        <p className="text-xs text-yellow-600 mt-1">
          Expires in {daysUntilExpiration} days
        </p>
      )}
    </div>
  );
};

// Usage in table
<td className="px-6 py-4 whitespace-nowrap">
  <ConsentStatus 
    status={contact.consentStatus} 
    expirationDate={contact.consentExpiration} 
  />
</td>
```

### 3. Community Data Control Integration (Task 19)

Add data export and control features to your contact management interface:

```jsx
// Data export component
const DataExportControls = ({ selectedContacts, allContacts }) => {
  const exportFormats = [
    { id: 'json', name: 'JSON', icon: CodeIcon },
    { id: 'csv', name: 'CSV', icon: TableIcon },
    { id: 'pdf', name: 'PDF', icon: DocumentIcon },
  ];

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Export Contact Data
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Export {selectedContacts.length > 0 
              ? `${selectedContacts.length} selected contacts` 
              : 'all contacts'} in your preferred format.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {exportFormats.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => handleExport(format.id, selectedContacts.length > 0 ? selectedContacts : allContacts)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <format.icon className="-ml-1 mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
              {format.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Conclusion

Modern contact management interfaces require a thoughtful blend of functionality, usability, and aesthetics. By implementing the patterns outlined in this research, you can create a robust contact management system that supports your project's requirements for authentication, consent tracking, and community data control.

For your specific project, focus on:

1. **Role-based access control** - Ensure your contact management interface respects the permission levels defined in Task 12
2. **Consent tracking integration** - Build comprehensive consent status visualization and management as required by Task 16
3. **Data portability** - Implement robust export functionality to support the community data control requirements in Task 19

These patterns, implemented with React and Tailwind CSS, will provide a solid foundation for your contact management system while maintaining a professional, accessible, and user-friendly interface.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-09-13T07:58:26.694Z*
