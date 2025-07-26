import { forwardRef } from 'react';
import FormField from './FormField';

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  helpText?: string;
  wrapperClassName?: string;
}

/**
 * DateInput component for date input fields
 */
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
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
          type="date"
          ref={ref}
          className={`block w-full rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            error
              ? 'border-red-300 text-red-900'
              : 'border-gray-300'
          } ${className}`}
          {...props}
        />
      </FormField>
    );
  }
);

DateInput.displayName = 'DateInput';

export default DateInput;