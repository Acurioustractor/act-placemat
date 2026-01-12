import React, { useState } from 'react';
import type { Subscription } from '../../types/subscription';

interface SubscriptionEditorProps {
  subscription: Subscription;
  onSave: (updates: Partial<Subscription>) => Promise<void>;
  onCancel: () => void;
}

/**
 * Inline editor for subscription details
 * Allows editing vendor, amount, frequency, status, tags, and notes
 */
export const SubscriptionEditor: React.FC<SubscriptionEditorProps> = ({
  subscription,
  onSave,
  onCancel,
}) => {
  const [vendor, setVendor] = useState(subscription.vendor || '');
  const [amount, setAmount] = useState(subscription.amount?.toString() || '');
  const [frequency, setFrequency] = useState(subscription.subscription_frequency || 'monthly');
  const [status, setStatus] = useState(subscription.status || 'active');
  const [category, setCategory] = useState(subscription.category || '');
  const [tags, setTags] = useState<string[]>(subscription.tags || []);
  const [notes, setNotes] = useState(subscription.notes || '');
  const [cancelReason, setCancelReason] = useState(subscription.cancel_reason || '');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        vendor,
        amount: amount ? parseFloat(amount) : null,
        subscription_frequency: frequency as any,
        status: status as any,
        category: category as any,
        tags,
        notes,
        cancel_reason: status === 'canceled' ? cancelReason : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'No Category' },
    { value: 'saas', label: '💻 SaaS & Software' },
    { value: 'infrastructure', label: '🏗️ Infrastructure & Hosting' },
    { value: 'design', label: '🎨 Design Tools' },
    { value: 'marketing', label: '📢 Marketing & Analytics' },
    { value: 'communication', label: '💬 Communication' },
    { value: 'productivity', label: '⚡ Productivity' },
    { value: 'development', label: '👨‍💻 Development Tools' },
    { value: 'business', label: '📊 Business Services' },
    { value: 'entertainment', label: '🎬 Entertainment' },
    { value: 'other', label: '📦 Other' },
  ];

  const quickTags = [
    'Essential',
    'Team',
    'Personal',
    'Review Needed',
    'Expensive',
    'Rarely Used',
    'Auto-Renew',
    'Trial',
    'Shared Account',
  ];

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Subscription</h3>

      <div className="space-y-4">
        {/* Vendor Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor Name
          </label>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Figma, AWS, Notion"
          />
        </div>

        {/* Amount & Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="active">✅ Active</option>
            <option value="canceled">❌ Canceled</option>
            <option value="paused">⏸️ Paused</option>
            <option value="pending_review">🔍 Pending Review</option>
          </select>
        </div>

        {/* Cancel Reason (if canceled) */}
        {status === 'canceled' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancel Reason
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., No longer needed, Too expensive"
            />
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>

          {/* Current Tags */}
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Quick Tags */}
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">Quick add:</div>
            <div className="flex flex-wrap gap-2">
              {quickTags.map(quickTag => (
                <button
                  key={quickTag}
                  onClick={() => {
                    if (!tags.includes(quickTag)) {
                      setTags([...tags, quickTag]);
                    }
                  }}
                  disabled={tags.includes(quickTag)}
                  className={`px-2 py-1 text-xs rounded border ${
                    tags.includes(quickTag)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {quickTag}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Add custom tag..."
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any notes about this subscription..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};
