import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon,
  MicrophoneIcon,
  PhotoIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { useProjects, useOpportunities, usePeople } from '../../hooks';
import { ArtifactType, ArtifactFormat, ArtifactStatus, ArtifactPurpose } from '../../types';
import { EmailCaptureForm } from '../emailCapture';
import { VoiceRecorder } from '../voiceCapture';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CaptureMode = 'select' | 'note' | 'voice' | 'image' | 'email' | 'meeting' | 'link';

/**
 * Modal for quick content capture
 * Supports multiple input types and auto-linking to entities
 */
const QuickCaptureModal = ({ isOpen, onClose }: QuickCaptureModalProps) => {
  const [mode, setMode] = useState<CaptureMode>('select');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  
  // Load entity data for linking
  const { data: projects = [] } = useProjects();
  const { data: opportunities = [] } = useOpportunities();
  const { data: people = [] } = usePeople();

  const captureOptions = [
    { id: 'note', label: 'Quick Note', icon: DocumentTextIcon, color: 'blue' },
    { id: 'voice', label: 'Voice Recording', icon: MicrophoneIcon, color: 'purple' },
    { id: 'image', label: 'Image/Screenshot', icon: PhotoIcon, color: 'green' },
    { id: 'email', label: 'Email Thread', icon: EnvelopeIcon, color: 'red' },
    { id: 'meeting', label: 'Meeting Notes', icon: CalendarDaysIcon, color: 'amber' },
    { id: 'link', label: 'Web Link', icon: LinkIcon, color: 'indigo' }
  ];

  const handleSubmit = async () => {
    // TODO: Implement API call to create artifact
    const artifactData = {
      name: title,
      type: getArtifactType(),
      format: getArtifactFormat(),
      status: ArtifactStatus.DRAFT,
      description: content,
      relatedProjects: selectedProjects,
      relatedOpportunities: selectedOpportunities,
      relatedOrganizations: selectedOrganizations,
      relatedPeople: selectedPeople,
      purpose: ArtifactPurpose.INTERNAL,
      lastModified: new Date()
    };

    console.log('Creating artifact:', artifactData);
    // Reset and close
    resetForm();
    onClose();
  };

  const getArtifactType = (): ArtifactType => {
    switch (mode) {
      case 'email': return ArtifactType.CONTRACT;
      case 'meeting': return ArtifactType.REPORT;
      case 'voice': return ArtifactType.MEDIA;
      case 'image': return ArtifactType.MEDIA;
      case 'link': return ArtifactType.RESEARCH;
      default: return ArtifactType.REPORT;
    }
  };

  const getArtifactFormat = (): ArtifactFormat => {
    switch (mode) {
      case 'voice': return ArtifactFormat.AUDIO;
      case 'image': return ArtifactFormat.IMAGE;
      case 'link': return ArtifactFormat.WEB;
      default: return ArtifactFormat.DOC;
    }
  };

  const resetForm = () => {
    setMode('select');
    setTitle('');
    setContent('');
    setSelectedProjects([]);
    setSelectedOpportunities([]);
    setSelectedOrganizations([]);
    setSelectedPeople([]);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all sm:w-full sm:max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    Quick Capture
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  {mode === 'select' ? (
                    <>
                      <p className="mb-6 text-sm text-gray-600">
                        Choose how you'd like to capture content
                      </p>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {captureOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setMode(option.id as CaptureMode)}
                            className={`flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 transition-all hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                          >
                            <option.icon className={`h-8 w-8 text-${option.color}-600`} />
                            <span className="text-sm font-medium text-gray-900">
                              {option.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      {/* Back button */}
                      <button
                        onClick={() => setMode('select')}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        ← Back to options
                      </button>

                      {/* Title input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                          placeholder={`Enter ${mode} title...`}
                        />
                      </div>

                      {/* Mode-specific content */}
                      {mode === 'note' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Note Content
                          </label>
                          <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                            placeholder="Type your note here..."
                          />
                        </div>
                      )}

                      {mode === 'voice' && (
                        <div className="space-y-4">
                          <VoiceRecorder 
                            onRecordingComplete={(audioBlob, duration) => {
                              console.log('Recording complete:', { audioBlob, duration });
                            }}
                            onTranscriptionComplete={(transcription) => {
                              setContent(transcription);
                            }}
                          />
                          
                          {content && (
                            <div className="border-t pt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Transcription (editable)
                              </label>
                              <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                                placeholder="Transcribed text will appear here..."
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {mode === 'image' && (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-sm text-gray-600">
                            Drag & drop or click to upload image
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="mt-4 inline-block cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                          >
                            Choose File
                          </label>
                        </div>
                      )}

                      {mode === 'email' && (
                        <EmailCaptureForm 
                          onSubmit={(data) => {
                            console.log('Email artifact created:', data);
                            resetForm();
                            onClose();
                          }}
                          onCancel={() => setMode('select')}
                        />
                      )}

                      {mode === 'meeting' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Meeting Date
                            </label>
                            <input
                              type="datetime-local"
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Attendees
                            </label>
                            <select
                              multiple
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setSelectedPeople(selected);
                              }}
                            >
                              {people.map(person => (
                                <option key={person.id} value={person.id}>
                                  {person.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Meeting Notes
                            </label>
                            <textarea
                              value={content}
                              onChange={(e) => setContent(e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                              placeholder="Key discussion points, decisions, action items..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Entity linking section */}
                      <div className="border-t pt-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-4">
                          Link to related items
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Projects
                            </label>
                            <select
                              multiple
                              size={3}
                              className="w-full rounded border border-gray-300 text-sm"
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setSelectedProjects(selected);
                              }}
                            >
                              {projects.map(project => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Opportunities
                            </label>
                            <select
                              multiple
                              size={3}
                              className="w-full rounded border border-gray-300 text-sm"
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setSelectedOpportunities(selected);
                              }}
                            >
                              {opportunities.map(opp => (
                                <option key={opp.id} value={opp.id}>
                                  {opp.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {mode !== 'email' && (
                  <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                      onClick={onClose}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    {mode !== 'select' && (
                      <button
                        onClick={handleSubmit}
                        disabled={!title}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Create Artifact
                      </button>
                    )}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default QuickCaptureModal;