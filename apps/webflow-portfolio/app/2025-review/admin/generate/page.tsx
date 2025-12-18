'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MediaPicker } from '@/components/MediaPicker';
import { ProjectSelector } from '@/components/admin/ProjectSelector';
import { useProject } from '@/lib/projectContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Entry sizes
const ENTRY_SIZES = {
  hero: { label: 'Hero', icon: '🌟', color: 'bg-purple-500', description: 'Full-width with video/image' },
  featured: { label: 'Featured', icon: '⭐', color: 'bg-amber-500', description: 'Large card with details' },
  standard: { label: 'Standard', icon: '📌', color: 'bg-blue-500', description: 'Medium card' },
  compact: { label: 'Compact', icon: '•', color: 'bg-slate-500', description: 'Small entry' },
  marker: { label: 'Marker', icon: '·', color: 'bg-slate-600', description: 'Timeline dot only' },
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  TRAVEL: '✈️',
  STRATEGY: '🎯',
  MEETING: '🤝',
  BOARD: '📋',
  GRANT: '💰',
  PARTNERSHIP: '🤝',
  WORKSHOP: '🎓',
  EVENT: '🎉',
  NETWORK: '🌐',
  PROJECT: '🚀',
  CREATIVE: '🎨',
  OTHER: '📌',
};

interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  source: string;
  category: string;
  icon: string;
  size: string;
  importance: number;
  included: boolean;
  videoUrl?: string;      // YouTube/Vimeo embed URL
  photoUrl?: string;      // Photo URL for card
  metadata?: {
    location?: string;
    attendees?: number;
    isAllDay?: boolean;
    organizer?: string;
  };
  raw?: unknown; // Original calendar event data (stripped before saving)
}

interface MonthGroup {
  key: string;
  name: string;
  year: number;
  month: number;
  entries: TimelineEntry[];
}

interface TimelineData {
  year: number;
  entries: TimelineEntry[];
  months: MonthGroup[];
  stats: {
    total: number;
    bySize: Record<string, number>;
    byCategory: Record<string, number>;
    included: number;
  };
  videoBreaks?: { afterIndex: number; reason: string; month: string }[];
}

export default function TimelineGeneratorPage() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSize, setFilterSize] = useState<string | null>(null);
  const [showIncludedOnly, setShowIncludedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<'month' | 'list' | 'timeline'>('month');

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);

  // New entry modal
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    category: 'OTHER',
    size: 'standard',
    videoUrl: '',
    photoUrl: '',
  });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadingEntryId, setUploadingEntryId] = useState<string | null>(null);

  // Media picker state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<{ type: 'newEntry' | 'entry'; entryId?: string } | null>(null);

  // Handle media selection from picker
  const handleMediaSelect = (url: string) => {
    if (!mediaPickerTarget) return;

    if (mediaPickerTarget.type === 'newEntry') {
      setNewEntry(prev => ({ ...prev, photoUrl: url }));
    } else if (mediaPickerTarget.entryId) {
      updateEntry(mediaPickerTarget.entryId, { photoUrl: url });
    }
    setMediaPickerTarget(null);
  };

  // Open media picker for specific target
  const openMediaPicker = (type: 'newEntry' | 'entry', entryId?: string) => {
    setMediaPickerTarget({ type, entryId });
    setShowMediaPicker(true);
  };

  // Upload image file
  const uploadImage = async (file: File, targetType: 'newEntry' | 'entry', entryId?: string): Promise<string | null> => {
    setUploading(true);
    if (entryId) setUploadingEntryId(entryId);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('manual_tags', 'timeline,2025-review');

      // Auto-tag with selected project
      if (selectedProject) {
        formData.append('project_ids', selectedProject.id);
      }

      const res = await fetch(`${API_BASE}/api/media/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await res.json();
      const imageUrl = result.fileUrl || result.publicUrl || result.url;

      if (!imageUrl) {
        throw new Error('No URL returned from upload');
      }

      // Update the appropriate state
      if (targetType === 'newEntry') {
        setNewEntry(prev => ({ ...prev, photoUrl: imageUrl }));
      } else if (entryId) {
        updateEntry(entryId, { photoUrl: imageUrl });
      }

      return imageUrl;
    } catch (err) {
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return null;
    } finally {
      setUploading(false);
      setUploadingEntryId(null);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, targetType: 'newEntry' | 'entry', entryId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    await uploadImage(file, targetType, entryId);
    // Clear the input
    e.target.value = '';
  };

  // Compute stats and months from entries
  const computeTimelineData = (entries: TimelineEntry[], videoBreaks?: TimelineData['videoBreaks']): TimelineData => {
    // Group entries by month
    const monthsMap = new Map<string, MonthGroup>();
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthsMap.has(key)) {
        monthsMap.set(key, {
          key,
          name: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          year: date.getFullYear(),
          month: date.getMonth(),
          entries: []
        });
      }
      monthsMap.get(key)!.entries.push(entry);
    });

    // Sort entries within each month
    monthsMap.forEach(month => {
      month.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    // Sort months chronologically
    const months = Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    // Compute stats
    const stats = {
      total: entries.length,
      bySize: entries.reduce((acc, e) => {
        acc[e.size] = (acc[e.size] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCategory: entries.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      included: entries.filter(e => e.included).length
    };

    return {
      year: 2025,
      entries,
      months,
      stats,
      videoBreaks
    };
  };

  // Load timeline data
  const loadTimeline = useCallback(async (regenerate = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE}/api/timeline-generator/2025`);
      if (regenerate) {
        url.searchParams.set('regenerate', 'true');
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load timeline');

      const result = await res.json();

      // If loaded from edited.json, it may not have stats/months - compute them
      if (result.entries && (!result.stats || !result.months)) {
        const computed = computeTimelineData(result.entries, result.videoBreaks);
        setData(computed);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate fresh timeline
  const handleGenerate = async () => {
    setGenerating(true);
    await loadTimeline(true);
    setGenerating(false);
  };

  // Save timeline
  const handleSave = async () => {
    if (!data) return;

    setSaving(true);
    try {
      await saveEntries(data.entries, data.videoBreaks);
      alert('Timeline saved!');
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Toggle entry inclusion
  const toggleIncluded = (id: string) => {
    if (!data) return;

    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map(e =>
          e.id === id ? { ...e, included: !e.included } : e
        ),
        months: prev.months.map(m => ({
          ...m,
          entries: m.entries.map(e =>
            e.id === id ? { ...e, included: !e.included } : e
          )
        }))
      };
    });
  };

  // Update entry
  const updateEntry = (id: string, updates: Partial<TimelineEntry>) => {
    if (!data) return;

    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map(e =>
          e.id === id ? { ...e, ...updates } : e
        ),
        months: prev.months.map(m => ({
          ...m,
          entries: m.entries.map(e =>
            e.id === id ? { ...e, ...updates } : e
          )
        }))
      };
    });
  };

  // Change entry size
  const changeSize = (id: string, newSize: string) => {
    updateEntry(id, { size: newSize });
  };

  // Save entries to backend (reusable helper)
  const saveEntries = async (entries: TimelineEntry[], videoBreaks?: TimelineData['videoBreaks']) => {
    const cleanEntries = entries.map(({ raw, ...entry }) => entry);
    const res = await fetch(`${API_BASE}/api/timeline-generator/2025/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: cleanEntries,
        videoBreaks: videoBreaks || data?.videoBreaks || []
      })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to save');
    }
    return res.json();
  };

  // Delete entry
  const deleteEntry = async (id: string) => {
    if (!data) return;
    if (!confirm('Delete this entry? This cannot be undone.')) return;

    const updatedEntries = data.entries.filter(e => e.id !== id);
    const wasIncluded = data.entries.find(e => e.id === id)?.included;

    // Update local state immediately
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: updatedEntries,
        months: prev.months.map(m => ({
          ...m,
          entries: m.entries.filter(e => e.id !== id)
        })),
        stats: {
          ...prev.stats,
          total: prev.stats.total - 1,
          included: wasIncluded ? prev.stats.included - 1 : prev.stats.included
        }
      };
    });

    // Persist to backend
    try {
      await saveEntries(updatedEntries, data.videoBreaks);
    } catch (err) {
      alert('Failed to save deletion: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Add new manual entry
  const addNewEntry = () => {
    if (!data || !newEntry.title.trim()) {
      alert('Please enter a title');
      return;
    }

    const entryDate = new Date(newEntry.date);
    const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
    const id = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entry: TimelineEntry = {
      id,
      date: newEntry.date,
      title: newEntry.title.trim(),
      description: newEntry.description.trim(),
      source: 'manual',
      category: newEntry.category,
      icon: CATEGORY_ICONS[newEntry.category] || '📌',
      size: newEntry.size,
      importance: 5,
      included: true,
      videoUrl: newEntry.videoUrl.trim() || undefined,
      photoUrl: newEntry.photoUrl.trim() || undefined,
    };

    setData(prev => {
      if (!prev) return prev;

      // Find or create month group
      let monthGroup = prev.months.find(m => m.key === monthKey);
      if (!monthGroup) {
        monthGroup = {
          key: monthKey,
          name: entryDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          year: entryDate.getFullYear(),
          month: entryDate.getMonth(),
          entries: [],
        };
      }

      const updatedMonths = prev.months.some(m => m.key === monthKey)
        ? prev.months.map(m =>
            m.key === monthKey
              ? { ...m, entries: [...m.entries, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) }
              : m
          )
        : [...prev.months, { ...monthGroup, entries: [entry] }].sort((a, b) => a.key.localeCompare(b.key));

      return {
        ...prev,
        entries: [...prev.entries, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        months: updatedMonths,
        stats: {
          ...prev.stats,
          total: prev.stats.total + 1,
          included: prev.stats.included + 1,
          byCategory: {
            ...prev.stats.byCategory,
            [entry.category]: (prev.stats.byCategory[entry.category] || 0) + 1,
          },
          bySize: {
            ...prev.stats.bySize,
            [entry.size]: (prev.stats.bySize[entry.size] || 0) + 1,
          },
        },
      };
    });

    // Reset form and close modal
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      category: 'OTHER',
      size: 'standard',
      videoUrl: '',
      photoUrl: '',
    });
    setShowNewEntryModal(false);
  };

  // Create story page for entry
  const createStoryPage = async (entry: TimelineEntry) => {
    try {
      const res = await fetch(`${API_BASE}/api/year-in-review/2025/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timelineEntryId: entry.id,
          title: entry.title,
          subtitle: entry.description?.substring(0, 200) || '',
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');

      const result = await res.json();
      // Open the project editor in a new tab
      window.open(`/2025-review/admin/projects/${result.slug}`, '_blank');
    } catch (err) {
      alert('Failed to create story page: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Filter entries
  const filterEntries = (entries: TimelineEntry[]) => {
    return entries.filter(e => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterSize && e.size !== filterSize) return false;
      if (showIncludedOnly && !e.included) return false;
      if (searchTerm && !e.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  };

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/2025-review/admin"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ← Back
                  </Link>
                  <h1 className="text-2xl font-bold">Timeline Generator</h1>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  Auto-generate timeline from your calendar, then edit and curate
                </p>
              </div>
              {/* Project Selector */}
              <ProjectSelector coreProjectsOnly={true} />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNewEntryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Entry
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Timeline'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {data && (
        <div className="bg-slate-800/50 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total:</span>
                <span className="font-medium">{data.stats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Included:</span>
                <span className="font-medium text-teal-400">{data.stats.included}</span>
              </div>
              <div className="h-4 w-px bg-slate-600" />
              {Object.entries(data.stats.bySize).map(([size, count]) => (
                <div key={size} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${ENTRY_SIZES[size as keyof typeof ENTRY_SIZES]?.color || 'bg-slate-500'}`} />
                  <span className="text-slate-400">{ENTRY_SIZES[size as keyof typeof ENTRY_SIZES]?.label || size}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/30 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Category filter */}
            <select
              value={filterCategory || ''}
              onChange={e => setFilterCategory(e.target.value || null)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Categories</option>
              {data && Object.entries(data.stats.byCategory).map(([cat, count]) => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat] || '📌'} {cat} ({count})
                </option>
              ))}
            </select>

            {/* Size filter */}
            <select
              value={filterSize || ''}
              onChange={e => setFilterSize(e.target.value || null)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Sizes</option>
              {Object.entries(ENTRY_SIZES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.icon} {val.label}
                </option>
              ))}
            </select>

            {/* Included only toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showIncludedOnly}
                onChange={e => setShowIncludedOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-300">Included only</span>
            </label>

            {/* View mode */}
            <div className="flex bg-slate-700 rounded-lg p-1 ml-auto">
              {(['month', 'list', 'timeline'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm rounded capitalize ${
                    viewMode === mode ? 'bg-slate-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      {data && (
        <main className="max-w-7xl mx-auto px-6 py-8">
          {viewMode === 'month' && (
            <div className="space-y-8">
              {data.months.map(month => {
                const filteredEntries = filterEntries(month.entries);
                if (filteredEntries.length === 0) return null;

                return (
                  <div key={month.key} className="bg-slate-800 rounded-xl overflow-hidden">
                    {/* Month header */}
                    <div className="bg-gradient-to-r from-teal-600/20 to-purple-600/20 px-6 py-4 border-b border-slate-700">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">{month.name}</h2>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-400">
                            {filteredEntries.length} entries
                          </span>
                          <span className="text-teal-400">
                            {filteredEntries.filter(e => e.included).length} included
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Entries */}
                    <div className="divide-y divide-slate-700">
                      {filteredEntries.map(entry => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          isEditing={editingId === entry.id}
                          onToggleInclude={() => toggleIncluded(entry.id)}
                          onChangeSize={(size) => changeSize(entry.id, size)}
                          onUpdate={(updates) => updateEntry(entry.id, updates)}
                          onStartEdit={() => setEditingId(entry.id)}
                          onEndEdit={() => setEditingId(null)}
                          onDelete={() => deleteEntry(entry.id)}
                          onCreateStoryPage={() => createStoryPage(entry)}
                          onFileSelect={(e, entryId) => handleFileSelect(e, 'entry', entryId)}
                          onBrowseMedia={(entryId) => openMediaPicker('entry', entryId)}
                          isUploading={uploading && uploadingEntryId === entry.id}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-700">
                {filterEntries(data.entries).map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isEditing={editingId === entry.id}
                    onToggleInclude={() => toggleIncluded(entry.id)}
                    onChangeSize={(size) => changeSize(entry.id, size)}
                    onUpdate={(updates) => updateEntry(entry.id, updates)}
                    onStartEdit={() => setEditingId(entry.id)}
                    onEndEdit={() => setEditingId(null)}
                    onDelete={() => deleteEntry(entry.id)}
                    onCreateStoryPage={() => createStoryPage(entry)}
                    onFileSelect={(e, entryId) => handleFileSelect(e, 'entry', entryId)}
                    onBrowseMedia={(entryId) => openMediaPicker('entry', entryId)}
                    isUploading={uploading && uploadingEntryId === entry.id}
                  />
                ))}
              </div>
            </div>
          )}

          {viewMode === 'timeline' && (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-700" />

              <div className="space-y-4">
                {filterEntries(data.entries).map((entry, index) => (
                  <div key={entry.id} className="relative pl-20">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-6 w-4 h-4 rounded-full border-2 border-slate-900 ${
                        entry.included
                          ? ENTRY_SIZES[entry.size as keyof typeof ENTRY_SIZES]?.color || 'bg-slate-500'
                          : 'bg-slate-700'
                      }`}
                    />

                    {/* Entry card */}
                    <div
                      className={`bg-slate-800 rounded-lg p-4 ${
                        !entry.included ? 'opacity-50' : ''
                      } ${
                        entry.size === 'hero' ? 'border-2 border-purple-500/50' :
                        entry.size === 'featured' ? 'border border-amber-500/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={entry.included}
                          onChange={() => toggleIncluded(entry.id)}
                          className="mt-1 w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                            <span>{entry.icon}</span>
                            <span className="px-1.5 py-0.5 bg-slate-700 rounded">{entry.category}</span>
                            {entry.videoUrl && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Video</span>
                            )}
                            {entry.photoUrl && (
                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">Photo</span>
                            )}
                          </div>
                          <p className="font-medium">{entry.title}</p>
                          {entry.description && (
                            <p className="text-sm text-slate-400 mt-1">{entry.description}</p>
                          )}
                          {entry.photoUrl && (
                            <img
                              src={entry.photoUrl}
                              alt=""
                              className="mt-2 max-h-24 rounded border border-slate-600"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={entry.size}
                            onChange={e => changeSize(entry.id, e.target.value)}
                            className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
                          >
                            {Object.entries(ENTRY_SIZES).map(([key, val]) => (
                              <option key={key} value={key}>{val.icon} {val.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add New Entry</h2>
              <button
                onClick={() => setShowNewEntryModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={newEntry.title}
                  onChange={e => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What happened?"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={newEntry.description}
                  onChange={e => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell the story..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Category & Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newEntry.category}
                    onChange={e => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
                      <option key={key} value={key}>{icon} {key}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Display Size</label>
                  <select
                    value={newEntry.size}
                    onChange={e => setNewEntry(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    {Object.entries(ENTRY_SIZES).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {val.label} - {val.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Photo</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newEntry.photoUrl}
                    onChange={e => setNewEntry(prev => ({ ...prev, photoUrl: e.target.value }))}
                    placeholder="Paste URL, browse, or upload..."
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                  {/* Browse Media Library */}
                  <button
                    type="button"
                    onClick={() => openMediaPicker('newEntry')}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Browse
                  </button>
                  {/* Upload */}
                  <label className={`px-4 py-2 rounded-lg font-medium cursor-pointer flex items-center gap-2 transition-colors ${
                    uploading ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-500 text-white'
                  }`}>
                    {uploading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={e => handleFileSelect(e, 'newEntry')}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-1">Paste a URL or upload an image (max 10MB)</p>
                {newEntry.photoUrl && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={newEntry.photoUrl}
                      alt="Preview"
                      className="max-h-32 rounded-lg border border-slate-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      onClick={() => setNewEntry(prev => ({ ...prev, photoUrl: '' }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Video URL</label>
                <input
                  type="url"
                  value={newEntry.videoUrl}
                  onChange={e => setNewEntry(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
                <p className="text-xs text-slate-500 mt-1">Paste any YouTube or Vimeo URL</p>
                {newEntry.videoUrl && (
                  <div className="mt-2 aspect-video max-w-md bg-slate-900 rounded-lg overflow-hidden">
                    <iframe
                      src={newEntry.videoUrl.includes('embed')
                        ? newEntry.videoUrl
                        : newEntry.videoUrl.includes('youtube.com/watch')
                          ? newEntry.videoUrl.replace('watch?v=', 'embed/')
                          : newEntry.videoUrl.includes('youtu.be')
                            ? `https://youtube.com/embed/${newEntry.videoUrl.split('/').pop()}`
                            : newEntry.videoUrl.includes('vimeo.com')
                              ? `https://player.vimeo.com/video/${newEntry.videoUrl.split('/').pop()}`
                              : newEntry.videoUrl
                      }
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewEntryModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addNewEntry}
                disabled={!newEntry.title.trim()}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => {
          setShowMediaPicker(false);
          setMediaPickerTarget(null);
        }}
        onSelect={handleMediaSelect}
        defaultTags={['timeline', '2025-review']}
      />
    </div>
  );
}

// Entry row component
interface EntryRowProps {
  entry: TimelineEntry;
  isEditing: boolean;
  onToggleInclude: () => void;
  onChangeSize: (size: string) => void;
  onUpdate: (updates: Partial<TimelineEntry>) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onDelete: () => void;
  onCreateStoryPage: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, entryId: string) => void;
  onBrowseMedia: (entryId: string) => void;
  isUploading: boolean;
}

function EntryRow({ entry, isEditing, onToggleInclude, onChangeSize, onUpdate, onStartEdit, onEndEdit, onDelete, onCreateStoryPage, onFileSelect, onBrowseMedia, isUploading }: EntryRowProps) {
  const sizeConfig = ENTRY_SIZES[entry.size as keyof typeof ENTRY_SIZES] || ENTRY_SIZES.compact;

  return (
    <div
      className={`p-4 flex items-start gap-4 transition-all ${
        !entry.included ? 'opacity-50 bg-slate-800/50' : ''
      } ${
        entry.size === 'hero' ? 'bg-purple-900/10' :
        entry.size === 'featured' ? 'bg-amber-900/10' : ''
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={entry.included}
        onChange={onToggleInclude}
        className="mt-1 w-5 h-5 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
      />

      {/* Size indicator */}
      <div className={`w-2 h-full min-h-[40px] rounded-full ${sizeConfig.color}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span className="text-lg">{entry.icon}</span>
          <span>{new Date(entry.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="px-1.5 py-0.5 bg-slate-700/50 rounded">{entry.category}</span>
          {entry.metadata?.attendees && entry.metadata.attendees > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
              {entry.metadata.attendees} people
            </span>
          )}
          {entry.metadata?.location && (
            <span className="text-slate-500 truncate max-w-[200px]" title={entry.metadata.location}>
              📍 {entry.metadata.location.split(',')[0]}
            </span>
          )}
          {/* Media indicators */}
          {entry.videoUrl && (
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Video
            </span>
          )}
          {entry.photoUrl && (
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Photo
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3 bg-slate-700/30 rounded-lg p-4 -mx-2">
            {/* Title */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={entry.title}
                onChange={e => onUpdate({ title: e.target.value })}
                className="w-full bg-slate-700 border border-teal-500 rounded px-3 py-2 text-white font-medium focus:outline-none"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                value={entry.description || ''}
                onChange={e => onUpdate({ description: e.target.value })}
                placeholder="Add a description..."
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500"
                rows={3}
              />
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Video URL (paste any YouTube or Vimeo link)
              </label>
              <input
                type="url"
                value={entry.videoUrl || ''}
                onChange={e => onUpdate({ videoUrl: e.target.value || undefined })}
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500"
              />
              {entry.videoUrl && (
                <div className="mt-2 aspect-video max-w-sm bg-slate-900 rounded overflow-hidden">
                  <iframe
                    src={entry.videoUrl.includes('embed')
                      ? entry.videoUrl
                      : entry.videoUrl.includes('youtube.com/watch')
                        ? entry.videoUrl.replace('watch?v=', 'embed/')
                        : entry.videoUrl.includes('youtu.be')
                          ? `https://youtube.com/embed/${entry.videoUrl.split('/').pop()}`
                          : entry.videoUrl.includes('vimeo.com')
                            ? `https://player.vimeo.com/video/${entry.videoUrl.split('/').pop()}`
                            : entry.videoUrl
                    }
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>

            {/* Photo URL */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Photo</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={entry.photoUrl || ''}
                  onChange={e => onUpdate({ photoUrl: e.target.value || undefined })}
                  placeholder="Paste URL, browse, or upload..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500"
                />
                {/* Browse Media Library */}
                <button
                  type="button"
                  onClick={() => onBrowseMedia(entry.id)}
                  className="px-3 py-2 rounded font-medium flex items-center gap-1 text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Browse</span>
                </button>
                {/* Upload */}
                <label className={`px-3 py-2 rounded font-medium cursor-pointer flex items-center gap-1 text-sm transition-colors ${
                  isUploading ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-500 text-white'
                }`}>
                  {isUploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={e => onFileSelect(e, entry.id)}
                  />
                </label>
              </div>
              {entry.photoUrl && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={entry.photoUrl}
                    alt="Preview"
                    className="max-h-32 rounded border border-slate-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    onClick={() => onUpdate({ photoUrl: undefined })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-600">
              <div className="flex items-center gap-2">
                <button
                  onClick={onDelete}
                  className="text-xs px-3 py-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                <button
                  onClick={onCreateStoryPage}
                  className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Story Page
                </button>
              </div>
              <button
                onClick={onEndEdit}
                className="text-sm px-4 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-500 font-medium"
              >
                Done Editing
              </button>
            </div>
          </div>
        ) : (
          <div onClick={onStartEdit} className="cursor-pointer group">
            <p className="font-medium group-hover:text-teal-400 transition-colors">{entry.title}</p>
            {entry.description && (
              <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{entry.description}</p>
            )}
            {/* Show photo thumbnail when not editing */}
            {entry.photoUrl && (
              <img
                src={entry.photoUrl}
                alt=""
                className="mt-2 max-h-20 rounded border border-slate-600 opacity-70 group-hover:opacity-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Size selector and delete */}
      <div className="flex items-center gap-2">
        <select
          value={entry.size}
          onChange={e => onChangeSize(e.target.value)}
          className="text-sm bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-teal-500"
        >
          {Object.entries(ENTRY_SIZES).map(([key, val]) => (
            <option key={key} value={key}>{val.icon} {val.label}</option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
          title="Delete entry"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
