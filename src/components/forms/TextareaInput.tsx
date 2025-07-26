import { forwardRef } from 'react';
import FormField from './FormField';

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
  helpText?: string;
  wrapperClassName?: string;
}

/**
 * TextareaInput component for multiline text input fields
 */
const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  ({ label, name, error, helpText, wrapperClassName = '', className = '', ...props }, ref) => {
    return (
      <FormField
        label={label}
        name={name}
        error={error}
        required={props.required}
        helpText={helpText}
        className={wrapperClassName}
      >
        <textarea
          id={name}
          name={name}
          ref={ref}
          rows={props.rows || 3}
          className={`block w-full rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300'
              : 'border-gray-300 placeholder-gray-400'
          } ${className}`}
          {...props}
        />
      </FormField>
    );
  }
);

TextareaInput.displayName = 'TextareaInput';

export default TextareaInput;