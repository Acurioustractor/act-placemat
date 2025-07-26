import { forwardRef } from 'react';
import FormField from './FormField';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  helpText?: string;
  wrapperClassName?: string;
}

/**
 * TextInput component for text input fields
 */
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
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
        <input
          id={name}
          name={name}
          ref={ref}
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

TextInput.displayName = 'TextInput';

export default TextInput;