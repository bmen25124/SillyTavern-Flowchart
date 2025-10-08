import React, { FC, InputHTMLAttributes } from 'react';

interface ComboBoxInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: string[];
  listId: string;
}

export const ComboBoxInput: FC<ComboBoxInputProps> = ({ value, onChange, options, listId, ...props }) => {
  return (
    <>
      <input type="text" className="text_pole" value={value} onChange={onChange} list={listId} {...props} />
      <datalist id={listId}>
        {options.map((option, index) => (
          <option key={index} value={option} />
        ))}
      </datalist>
    </>
  );
};
