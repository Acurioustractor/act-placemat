/**
 * CompendiumWiki - Markdown wiki viewer with inline editing
 *
 * Used for Goods Asset Register Compendium and similar documents
 * Supports: viewing, editing, searching, and navigation
 */

import { useState, useCallback, useEffect } from 'react'

interface WikiPage {
  id: string
  title: string
  content: string
  slug: string
  section?: string
  last_updated?: string
}

interface CompendiumWikiProps {
  pages: WikiPage[]
  title: string
  basePath?: string
  onSave?: (slug: string, content: string) => Promise<void>
  readOnly?: boolean
}

export function CompendiumWiki({
  pages,
  title,
  basePath = '/wiki',
  onSave,
  readOnly = false,
}: CompendiumWikiProps) {
  const [activePage, setActivePage] = useState<string>(pages[0]?.slug || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'split' | 'view'>('view')

  const currentPage = pages.find(p => p.slug === activePage)

  // Filter pages by search
  const filteredPages = pages.filter(p => {
    const query = searchQuery.toLowerCase()
    return (
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      p.section?.toLowerCase().includes(query)
    )
  })

  // Group pages by section
  const groupedPages = filteredPages.reduce((acc, page) => {
    const section = page.section || 'General'
    if (!acc[section]) acc[section] = []
    acc[section].push(page)
    return acc
  }, {} as Record<string, WikiPage[]>)

  const handleEdit = useCallback(() => {
    if (currentPage) {
      setEditContent(currentPage.content)
      setIsEditing(true)
    }
  }, [currentPage])

  const handleSave = useCallback(async () => {
    if (!onSave || !currentPage) return
    setIsSaving(true)
    try {
      await onSave(currentPage.slug, editContent)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }, [onSave, currentPage, editContent])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setEditContent('')
  }, [])

  // Parse markdown to HTML (simple parser)
  const parseMarkdown = (content: string): string => {
    return content
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold/Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Tables (basic)
      .replace(/\|(.+)\|/gim, (match) => {
        const cells = match.split('|').filter(c => c.trim())
        if (cells[0].includes('---')) return ''
        const isHeader = cells.some(c => c.trim().length > 0 && !c.includes(':'))
        return `<tr>${cells.map(c => `<${isHeader ? 'th' : 'td'}>${c.trim()}</${isHeader ? 'th' : 'td'}>`).join('')}</tr>`
      })
      // Code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      // Line breaks
      .replace(/\n/gim, '<br>')
  }

  return (
    <div className="compendium-wiki" style={wikiContainerStyle}>
      {/* Header */}
      <div className="wiki-header" style={wikiHeaderStyle}>
        <h1 style={wikiTitleStyle}>{title}</h1>
        <div style={wikiControlsStyle}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
          <div style={viewToggleStyle}>
            <button
              onClick={() => setViewMode('view')}
              style={viewMode === 'view' ? activeViewButtonStyle : viewButtonStyle}
            >
              View
            </button>
            <button
              onClick={() => setViewMode('split')}
              style={viewMode === 'split' ? activeViewButtonStyle : viewButtonStyle}
            >
              Split
            </button>
          </div>
          {!readOnly && onSave && !isEditing && currentPage && (
            <button onClick={handleEdit} style={editButtonStyle}>
              Edit Page
            </button>
          )}
        </div>
      </div>

      <div className="wiki-body" style={wikiBodyStyle}>
        {/* Sidebar Navigation */}
        <div className="wiki-sidebar" style={sidebarStyle}>
          {Object.entries(groupedPages).map(([section, sectionPages]) => (
            <div key={section} style={sectionGroupStyle}>
              <div style={sectionTitleStyle}>{section}</div>
              {sectionPages.map((page) => (
                <button
                  key={page.slug}
                  onClick={() => {
                    setActivePage(page.slug)
                    setIsEditing(false)
                  }}
                  style={
                    page.slug === activePage
                      ? activePageButtonStyle
                      : pageButtonStyle
                  }
                >
                  {page.title}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="wiki-content" style={contentStyle}>
          {isEditing ? (
            /* Edit Mode */
            <div style={editModeStyle}>
              <div style={editToolbarStyle}>
                <button onClick={handleCancel} style={toolbarButtonStyle}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={saveButtonStyle}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={editTextareaStyle}
                rows={30}
              />
              <div style={editPreviewStyle}>
                <h3 style={previewTitleStyle}>Preview</h3>
                <div
                  style={previewContentStyle}
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(editContent) }}
                />
              </div>
            </div>
          ) : viewMode === 'split' ? (
            /* Split Mode */
            <div style={splitViewStyle}>
              <div style={splitPaneStyle}>
                <h2 style={contentTitleStyle}>{currentPage?.title}</h2>
                <div style={markdownPaneStyle}>
                  <div
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(currentPage?.content || '') }}
                  />
                </div>
              </div>
              <div style={splitPaneStyle}>
                <h2 style={contentTitleStyle}>Table of Contents</h2>
                <div style={tocStyle}>
                  {currentPage?.content
                    ?.split('\n')
                    .filter(line => line.startsWith('#'))
                    .map((line, i) => {
                      const level = line.match(/^#+/)?.[0].length || 1
                      const text = line.replace(/^#+\s*/, '')
                      return (
                        <div
                          key={i}
                          style={{
                            ...tocItemStyle,
                            paddingLeft: `${level * 12 + 8}px`,
                          }}
                        >
                          {text}
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div style={viewPaneStyle}>
              {currentPage ? (
                <>
                  <h1 style={contentTitleStyle}>{currentPage.title}</h1>
                  {currentPage.last_updated && (
                    <div style={lastUpdatedStyle}>
                      Last updated: {new Date(currentPage.last_updated).toLocaleDateString()}
                    </div>
                  )}
                  <div
                    style={contentBodyStyle}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(currentPage.content) }}
                  />
                </>
              ) : (
                <div style={emptyStateStyle}>
                  <p>Select a page from the sidebar to view</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Styles
const wikiContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#f8fafc',
}

const wikiHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  background: 'white',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
}

const wikiTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1e293b',
  margin: 0,
}

const wikiControlsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
}

const searchInputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  width: '200px',
}

const viewToggleStyle: React.CSSProperties = {
  display: 'flex',
  borderRadius: '6px',
  overflow: 'hidden',
  border: '1px solid #cbd5e1',
}

const viewButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: 'none',
  background: 'white',
  fontSize: '13px',
  cursor: 'pointer',
}

const activeViewButtonStyle: React.CSSProperties = {
  ...viewButtonStyle,
  background: '#6366f1',
  color: 'white',
}

const editButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  cursor: 'pointer',
}

const wikiBodyStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
}

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  background: 'white',
  borderRight: '1px solid #e2e8f0',
  overflowY: 'auto',
  padding: '12px',
}

const sectionGroupStyle: React.CSSProperties = {
  marginBottom: '16px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  color: '#94a3b8',
  padding: '8px 12px',
  letterSpacing: '0.05em',
}

const pageButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  fontSize: '14px',
  color: '#475569',
  borderRadius: '6px',
  cursor: 'pointer',
}

const activePageButtonStyle: React.CSSProperties = {
  ...pageButtonStyle,
  background: '#f1f5f9',
  color: '#1e293b',
  fontWeight: '500',
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '24px',
}

const editModeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const editToolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
}

const toolbarButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: 'white',
  cursor: 'pointer',
}

const saveButtonStyle: React.CSSProperties = {
  ...toolbarButtonStyle,
  background: '#22c55e',
  color: 'white',
  border: 'none',
}

const editTextareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontFamily: 'monospace',
  fontSize: '14px',
  resize: 'vertical',
}

const editPreviewStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '16px',
}

const previewTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#64748b',
  marginBottom: '12px',
}

const previewContentStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.7',
  color: '#475569',
}

const splitViewStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '24px',
}

const splitPaneStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '20px',
  overflow: 'auto',
}

const contentTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1e293b',
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e2e8f0',
}

const markdownPaneStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.8',
  color: '#475569',
}

const tocStyle: React.CSSProperties = {
  fontSize: '13px',
}

const tocItemStyle: React.CSSProperties = {
  padding: '4px 8px',
  color: '#64748b',
  borderRadius: '4px',
  cursor: 'pointer',
}

const viewPaneStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '32px',
  maxWidth: '800px',
  margin: '0 auto',
}

const contentBodyStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.8',
  color: '#475569',
}

const lastUpdatedStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#94a3b8',
  marginBottom: '24px',
}

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#94a3b8',
  padding: '40px',
}
