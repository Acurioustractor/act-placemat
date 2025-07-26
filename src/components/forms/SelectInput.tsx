import { forwardRef } from 'react';
import FormField from './FormField';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  name: string;
  options: SelectOption[];
  error?: string;
  helpText?: string;
  emptyOption?: string;
  wrapperClassName?: string;
}

/**
 * SelectInput component for dropdown selection fields
 */
const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ 
    label, 
    name, 
    options, 
    error, 
    helpText, 
    emptyOption, 
    wrapperClassName = '', 
    className = '', 
    ...props 
  }, ref) => {
    return (
      <FormField
        label={label}
        name={name}
        error={error}
        required={props.required}
        helpText={helpText}
        className={wrapperClassName}
      >
        <select
          id={name}
          name={name}
          ref={ref}
          className={`block w-full rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            error
              ? 'border-red-300 text-red-900'
              : 'border-gray-300'
          } ${className}`}
          {...props}
        >
          {emptyOption && (
            <option value="">{emptyOption}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
    );
  }
);

SelectInput.displayName = 'SelectInput';

export default SelectInput;