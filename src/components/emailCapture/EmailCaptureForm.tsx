import { useState } from 'react';
import { EnvelopeIcon, PaperClipIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useProjects, useOpportunities, useOrganizations, usePeople } from '../../hooks';
import { ArtifactType, ArtifactFormat, ArtifactStatus, ArtifactPurpose } from '../../types';

interface EmailCaptureFormProps {
  onSubmit?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}

interface EmailData {
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  date: Date;
  body: string;
  attachments: string[];
  thread: boolean;
}

/**
 * Form for capturing email content and converting to artifact
 * Supports manual entry and future Gmail/Outlook integration
 */
const EmailCaptureForm = ({ onSubmit, onCancel }: EmailCaptureFormProps) => {
  const [emailData, setEmailData] = useState<EmailData>({
    subject: '',
    from: '',
    to: [],
    cc: [],
    date: new Date(),
    body: '',
    attachments: [],
    thread: false
  });

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [extractedActions, setExtractedActions] = useState<string[]>([]);

  // Load entity data
  const { data: projects = [] } = useProjects();
  const { data: opportunities = [] } = useOpportunities();
  const { data: organizations = [] } = useOrganizations();
  const { data: people = [] } = usePeople();

  // Email parser to extract recipients
  const parseEmails = (emailString: string): string[] => {
    return emailString
      .split(/[,;]/)
      .map(email => email.trim())
      .filter(email => email.includes('@'));
  };

  // Extract action items from email body
  const extractActionItems = () => {
    const actionPatterns = [
      /action item[s]?:(.+?)(?:\n|$)/gi,
      /todo[s]?:(.+?)(?:\n|$)/gi,
      /next step[s]?:(.+?)(?:\n|$)/gi,
      /please (.+?)(?:\n|$)/gi,
      /can you (.+?)(?:\n|$)/gi,
      /will you (.+?)(?:\n|$)/gi
    ];

    const actions: string[] = [];
    actionPatterns.forEach(pattern => {
      const matches = emailData.body.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          actions.push(match[1].trim());
        }
      }
    });

    setExtractedActions(actions);
  };

  // Auto-suggest related entities based on email participants
  const suggestRelatedEntities = () => {
    const emailParticipants = [
      emailData.from,
      ...emailData.to,
      ...emailData.cc
    ].filter(Boolean);

    // Find people by email
    const relatedPeople = people.filter(person => 
      emailParticipants.some(email => 
        person.email.toLowerCase().includes(email.toLowerCase())
      )
    );
    setSelectedPeople(relatedPeople.map(p => p.id));

    // Find organizations from people
    const orgNames = relatedPeople.map(p => p.organization).filter(Boolean);
    const relatedOrgs = organizations.filter(org => 
      orgNames.some(name => org.name.toLowerCase().includes(name.toLowerCase()))
    );
    setSelectedOrganizations(relatedOrgs.map(o => o.id));
  };

  const handleSubmit = () => {
    const artifactData = {
      name: `Email: ${emailData.subject}`,
      type: ArtifactType.CONTRACT,
      format: ArtifactFormat.DOC,
      status: ArtifactStatus.APPROVED,
      description: formatEmailAsDescription(),
      relatedProjects: selectedProjects,
      relatedOpportunities: selectedOpportunities,
      relatedOrganizations: selectedOrganizations,
      relatedPeople: selectedPeople,
      purpose: ArtifactPurpose.CLIENT,
      tags: ['email', 'communication'],
      usageNotes: extractedActions.length > 0 
        ? `Action Items:\n${extractedActions.map(a => `- ${a}`).join('\n')}`
        : '',
      lastModified: new Date()
    };

    onSubmit?.(artifactData);
  };

  const formatEmailAsDescription = (): string => {
    return `
From: ${emailData.from}
To: ${emailData.to.join(', ')}
${emailData.cc.length > 0 ? `CC: ${emailData.cc.join(', ')}` : ''}
Date: ${emailData.date.toLocaleString()}
${emailData.thread ? 'Thread: Yes' : ''}

${emailData.body}

${emailData.attachments.length > 0 ? `\nAttachments: ${emailData.attachments.join(', ')}` : ''}
    `.trim();
  };

  return (
    <div className="space-y-6">
      {/* Email Header Section */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <EnvelopeIcon className="h-5 w-5 text-gray-600" />
          Email Details
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              placeholder="Email subject..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <input
                type="email"
                value={emailData.from}
                onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
                onBlur={suggestRelatedEntities}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                placeholder="sender@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="datetime-local"
                value={emailData.date.toISOString().slice(0, 16)}
                onChange={(e) => setEmailData({ ...emailData, date: new Date(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="text"
              value={emailData.to.join(', ')}
              onChange={(e) => setEmailData({ ...emailData, to: parseEmails(e.target.value) })}
              onBlur={suggestRelatedEntities}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              placeholder="recipient@example.com, another@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CC
            </label>
            <input
              type="text"
              value={emailData.cc.join(', ')}
              onChange={(e) => setEmailData({ ...emailData, cc: parseEmails(e.target.value) })}
              onBlur={suggestRelatedEntities}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              placeholder="cc@example.com"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailData.thread}
              onChange={(e) => setEmailData({ ...emailData, thread: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-gray-700">This is part of an email thread</span>
          </label>
        </div>
      </div>

      {/* Email Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Body
        </label>
        <textarea
          value={emailData.body}
          onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
          onBlur={extractActionItems}
          rows={8}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          placeholder="Paste or type the email content here..."
        />
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <PaperClipIcon className="inline h-4 w-4 mr-1" />
          Attachments
        </label>
        <input
          type="text"
          value={emailData.attachments.join(', ')}
          onChange={(e) => setEmailData({ 
            ...emailData, 
            attachments: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
          })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          placeholder="List attachment names (comma separated)"
        />
      </div>

      {/* Extracted Action Items */}
      {extractedActions.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-900 mb-2">
            Extracted Action Items
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {extractedActions.map((action, idx) => (
              <li key={idx} className="text-sm text-amber-800">{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Entities */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-4 w-4" />
          Link to Related Items
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Projects</label>
            <select
              multiple
              size={3}
              value={selectedProjects}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedProjects(selected);
              }}
              className="w-full rounded border border-gray-300 text-sm"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Opportunities</label>
            <select
              multiple
              size={3}
              value={selectedOpportunities}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedOpportunities(selected);
              }}
              className="w-full rounded border border-gray-300 text-sm"
            >
              {opportunities.map(opp => (
                <option key={opp.id} value={opp.id}>
                  {opp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              People {selectedPeople.length > 0 && '(auto-detected)'}
            </label>
            <select
              multiple
              size={3}
              value={selectedPeople}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedPeople(selected);
              }}
              className="w-full rounded border border-gray-300 text-sm"
            >
              {people.map(person => (
                <option key={person.id} value={person.id}>
                  {person.fullName} ({person.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Organizations {selectedOrganizations.length > 0 && '(auto-detected)'}
            </label>
            <select
              multiple
              size={3}
              value={selectedOrganizations}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedOrganizations(selected);
              }}
              className="w-full rounded border border-gray-300 text-sm"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!emailData.subject || !emailData.from || !emailData.body}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Create Email Artifact
        </button>
      </div>
    </div>
  );
};

export default EmailCaptureForm;