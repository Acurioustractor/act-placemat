import { useState } from 'react';
import { 
  ShareIcon,
  LinkIcon,
  EnvelopeIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ShareableArtifact {
  id: string;
  name: string;
  type: string;
  description: string;
  accessLevel: 'public' | 'internal' | 'restricted' | 'confidential';
  fileUrl?: string;
  createdBy: string;
  lastModified: Date;
}

interface SharePermission {
  type: 'view' | 'comment' | 'edit';
  expires?: Date;
  password?: boolean;
}

interface ShareLink {
  id: string;
  url: string;
  permissions: SharePermission;
  createdAt: Date;
  accessCount: number;
  lastAccessed?: Date;
}

interface ArtifactSharingProps {
  artifact: ShareableArtifact;
  onShare?: (shareData: Record<string, unknown>) => void;
}

/**
 * Quick artifact sharing component with multiple sharing options
 * Provides secure sharing with access controls and tracking
 */
const ArtifactSharing = ({ artifact, onShare }: ArtifactSharingProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shareMode, setShareMode] = useState<'link' | 'email' | 'embed'>('link');
  const [permissions, setPermissions] = useState<SharePermission>({ type: 'view' });
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Generate secure share link
  const generateShareLink = async () => {
    setIsGenerating(true);
    
    // Simulate API call to generate secure link
    const mockLink: ShareLink = {
      id: `share_${Date.now()}`,
      url: `https://actplacemat.com/shared/${artifact.id}?token=abc123`,
      permissions,
      createdAt: new Date(),
      accessCount: 0
    };

    setShareLinks([mockLink, ...shareLinks]);
    setIsGenerating(false);
    
    // Auto-copy to clipboard
    await copyToClipboard(mockLink.url);
    setCopiedLink(mockLink.id);
    setTimeout(() => setCopiedLink(null), 3000);

    onShare?.({
      type: 'link',
      artifactId: artifact.id,
      permissions,
      url: mockLink.url
    });
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  };

  // Send via email
  const sendEmail = () => {
    const emails = emailRecipients.split(',').map(e => e.trim()).filter(Boolean);
    
    if (emails.length === 0) return;

    const emailData = {
      type: 'email',
      artifactId: artifact.id,
      recipients: emails,
      message: shareMessage,
      permissions
    };

    console.log('Sending email share:', emailData);
    onShare?.(emailData);
    
    // Reset form
    setEmailRecipients('');
    setShareMessage('');
    setIsOpen(false);
  };

  // Generate embed code
  const generateEmbedCode = () => {
    const embedCode = `<iframe src="https://actplacemat.com/embed/${artifact.id}" width="100%" height="400" frameborder="0"></iframe>`;
    copyToClipboard(embedCode);
  };

  // Get access level icon and color
  const getAccessLevelDisplay = (level: string) => {
    switch (level) {
      case 'public':
        return { icon: GlobeAltIcon, color: 'text-green-600', bg: 'bg-green-100' };
      case 'internal':
        return { icon: UserGroupIcon, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'restricted':
        return { icon: EyeIcon, color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'confidential':
        return { icon: LockClosedIcon, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: LockClosedIcon, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const accessDisplay = getAccessLevelDisplay(artifact.accessLevel);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
      >
        <ShareIcon className="h-4 w-4" />
        Share
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setIsOpen(false)} />
        
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Share Artifact</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-900">{artifact.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{artifact.type}</span>
                <div className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${accessDisplay.bg} ${accessDisplay.color}`}>
                  <accessDisplay.icon className="h-3 w-3" />
                  {artifact.accessLevel}
                </div>
              </div>
            </div>
          </div>

          {/* Share Mode Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'link', label: 'Link', icon: LinkIcon },
                { id: 'email', label: 'Email', icon: EnvelopeIcon },
                { id: 'embed', label: 'Embed', icon: DocumentDuplicateIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setShareMode(tab.id as 'link' | 'email' | 'embed')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
                    shareMode === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level
              </label>
              <select
                value={permissions.type}
                onChange={(e) => setPermissions({ ...permissions, type: e.target.value as 'view' | 'comment' | 'edit' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="view">View Only</option>
                <option value="comment">View & Comment</option>
                <option value="edit">View & Edit</option>
              </select>
            </div>

            {shareMode === 'link' && (
              <div className="space-y-4">
                {/* Generate Link */}
                <button
                  onClick={generateShareLink}
                  disabled={isGenerating}
                  className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  Generate Secure Link
                </button>

                {/* Existing Links */}
                {shareLinks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Recent Links</h4>
                    {shareLinks.map((link) => (
                      <div key={link.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-gray-600 truncate">{link.url}</p>
                          <p className="text-xs text-gray-500">
                            Created {link.createdAt.toLocaleDateString()} • {link.accessCount} views
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(link.url)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          {copiedLink === link.id ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {shareMode === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients
                  </label>
                  <input
                    type="text"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    rows={3}
                    placeholder="Add a personal message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <button
                  onClick={sendEmail}
                  disabled={!emailRecipients.trim()}
                  className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                  Send Email
                </button>
              </div>
            )}

            {shareMode === 'embed' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Embed this artifact in your website or documentation.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-sm text-gray-800 break-all">
                    {`<iframe src="https://actplacemat.com/embed/${artifact.id}" width="100%" height="400" frameborder="0"></iframe>`}
                  </code>
                </div>

                <button
                  onClick={generateEmbedCode}
                  className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  Copy Embed Code
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Links expire in 30 days</span>
              <span>Track access in Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtifactSharing;