import { useState } from 'react';
import { PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ContactFormProps {
  projectName?: string;
  onSubmit?: (data: ContactFormData) => Promise<void>;
  className?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  projectName?: string;
}

/**
 * ContactForm - Simple contact form for inquiries
 *
 * Features:
 * - Name, email, subject, message fields
 * - Form validation
 * - Loading and success states
 * - Email integration ready
 * - Accessible labels and errors
 */
const ContactForm = ({
  projectName,
  onSubmit,
  className = ''
}: ContactFormProps) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: projectName ? `Inquiry about ${projectName}` : '',
    message: '',
    projectName
  });

  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default: mailto link
        const mailtoLink = `mailto:info@act.org?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
          `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
        )}`;
        window.location.href = mailtoLink;
      }

      setIsSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: projectName ? `Inquiry about ${projectName}` : '',
        message: '',
        projectName
      });

      // Reset success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ message: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Input component with error handling
  const Input = ({
    name,
    label,
    type = 'text',
    required = true,
    rows
  }: {
    name: keyof ContactFormData;
    label: string;
    type?: string;
    required?: boolean;
    rows?: number;
  }) => {
    const isTextarea = rows !== undefined;
    const InputComponent = isTextarea ? 'textarea' : 'input';

    return (
      <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <InputComponent
          id={name}
          name={name}
          type={type}
          rows={rows}
          value={formData[name] as string}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
            errors[name] ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors[name] && (
          <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 md:p-8 ${className}`}>
      {isSuccess ? (
        // Success Message
        <div className="text-center py-8">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Message Sent!
          </h3>
          <p className="text-gray-600">
            Thank you for reaching out. We'll get back to you soon.
          </p>
        </div>
      ) : (
        // Contact Form
        <>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Get In Touch
            </h3>
            <p className="text-gray-600">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input name="name" label="Your Name" />
              <Input name="email" label="Email Address" type="email" />
            </div>

            <Input name="subject" label="Subject" />
            <Input name="message" label="Message" rows={6} />

            {projectName && (
              <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded">
                <p className="text-sm text-primary-700">
                  <strong>Inquiring about:</strong> {projectName}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-lg transition-all ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 hover:scale-[1.02]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5" />
                  Send Message
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500 text-center">
            By submitting this form, you agree to our privacy policy.
          </p>
        </>
      )}
    </div>
  );
};

export default ContactForm;
