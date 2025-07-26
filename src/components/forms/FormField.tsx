import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  helpText?: string;
  className?: string;
}

/**
 * FormField component for wrapping form inputs with labels and error messages
 */
const FormField = ({
  label,
  name,
  error,
  required = false,
  children,
  helpText,
  className = '',
}: FormFieldProps) => {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {children}
      
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormField;