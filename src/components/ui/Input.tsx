import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            block w-full rounded-lg border px-3 py-2 text-slate-900 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
