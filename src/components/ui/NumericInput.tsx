import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  allowDecimals?: boolean;
  prefix?: string;
  suffix?: string;
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  className,
  allowDecimals = true,
  prefix,
  suffix,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value === 0 ? '' : value.toString());
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Clear the field if it's 0 or empty, position cursor at start
    if (value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
    }
    // Select all text for easy replacement
    setTimeout(() => {
      e.target.select();
    }, 0);
    
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    // If field is empty, revert to 0
    if (displayValue === '' || displayValue === '0') {
      setDisplayValue('');
      onChange(0);
    } else {
      // Ensure the display value matches the actual value
      setDisplayValue(value.toString());
    }
    
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Parse the numeric value
    let numericValue = 0;
    
    if (inputValue !== '') {
      if (allowDecimals) {
        numericValue = parseFloat(inputValue);
      } else {
        numericValue = parseInt(inputValue, 10);
      }
      
      // Handle invalid numbers
      if (isNaN(numericValue)) {
        return; // Don't update if invalid
      }
      
      // Apply min/max constraints
      if (min !== undefined && numericValue < min) {
        numericValue = min;
      }
      if (max !== undefined && numericValue > max) {
        numericValue = max;
      }
    }

    onChange(numericValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    
    // Ensure that it is a number or decimal point
    if (allowDecimals) {
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
          (e.keyCode < 96 || e.keyCode > 105) && 
          e.keyCode !== 190 && e.keyCode !== 110) {
        e.preventDefault();
      }
    } else {
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
          (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    }
    
    props.onKeyDown?.(e);
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        {...props}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || (value === 0 && !isFocused ? '0' : '')}
        className={cn(
          'w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          prefix && 'pl-8',
          suffix && 'pr-8',
          className
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}