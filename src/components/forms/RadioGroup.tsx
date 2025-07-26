import { forwardRef } from 'react';
import FormField from './FormField';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
  required?: boolean;
  inline?: boolean;
  wrapperClassName?: string;
}

/**
 * RadioGroup component for radio button groups
 */
const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ 
    label, 
    name, 
    options, 
    value, 
    onChange, 
    error, 
    helpText, 
    required = false, 
    inline = false,
    wrapperClassName = '', 
    className = '', 
    ...props 
  }, ref) => {
    return (
      <FormField
        label={label}
        name={name}
        error={error}
        required={required}
        helpText={helpText}
        className={wrapperClassName}
      >
        <div 
          ref={ref} 
          className={`${inline ? 'flex flex-wrap gap-4' : 'space-y-2'} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <div key={option.value} className={`${inline ? '' : 'flex items-start'}`}>
              <div className="flex items-center h-5">
                <input
                  id={`${name}-${option.value}`}
                  name={name}
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => onChange(option.value)}
                  disabled={option.disabled}
                  className={`h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500 ${
                    error ? 'border-red-300' : ''
                  }`}
                />
              </div>
              <div className="ml-3 text-sm">
                <label 
                  htmlFor={`${name}-${option.value}`} 
                  className={`font-medium ${option.disabled ? 'text-gray-400' : 'text-gray-700'}`}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p className={`${option.disabled ? 'text-gray-400' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </FormField>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;