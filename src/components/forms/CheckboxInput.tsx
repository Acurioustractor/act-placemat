import { forwardRef } from 'react';

interface CheckboxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  helpText?: string;
  className?: string;
}

/**
 * CheckboxInput component for checkbox input fields
 */
const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(
  ({ label, name, error, helpText, className = '', ...props }, ref) => {
    return (
      <div className={`flex items-start ${className}`}>
        <div className="flex items-center h-5">
          <input
            id={name}
            name={name}
            type="checkbox"
            ref={ref}
            className={`h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${
              error ? 'border-red-300' : ''
            }`}
            {...props}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor={name} className="font-medium text-gray-700">
            {label}
          </label>
          {helpText && !error && (
            <p className="text-gray-500">{helpText}</p>
          )}
          {error && (
            <p className="text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }
);

CheckboxInput.displayName = 'CheckboxInput';

export default CheckboxInput;