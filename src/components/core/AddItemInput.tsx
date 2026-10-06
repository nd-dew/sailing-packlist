import React, { useState } from 'react';

interface AddItemInputProps {
  onAdd: (name: string) => void;
  placeholder: string;
  className?: string;
  // lets keyboard shortcuts find the right field (e.g. "n" adds to the category of the selected row)
  dataAttrs?: Record<string, string>;
}

// "+ Add …" line: Enter adds and keeps the cursor here for the next one, leaving it adds what was typed
export const AddItemInput: React.FC<AddItemInputProps> = ({ onAdd, placeholder, className = '', dataAttrs }) => {
  const [value, setValue] = useState('');

  const add = () => {
    const name = value.trim();
    if (!name) return;
    onAdd(name);
    setValue('');
  };

  return (
    <div className={`add-item ${className}`}>
      <span className="add-item-plus" aria-hidden="true">+</span>
      <input
        className="add-item-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(); }
          if (e.key === 'Escape') { setValue(''); (e.target as HTMLInputElement).blur(); }
        }}
        onBlur={add}
        placeholder={placeholder}
        aria-label={placeholder}
        {...dataAttrs}
      />
    </div>
  );
};
