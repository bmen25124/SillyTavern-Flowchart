import React, { FC, InputHTMLAttributes, useMemo } from 'react';

interface ComboBoxInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: string[];
  listId: string;
  /**
   * Custom class name(s) to append or replace the default 'text_pole' class.
   */
  className?: string;
  /**
   * If set to true, the default 'text_pole' class will not be applied.
   * @default false
   */
  overrideDefaults?: boolean;
}

export const ComboBoxInput: FC<ComboBoxInputProps> = ({
  value,
  onChange,
  options,
  listId,
  overrideDefaults,
  className,
  ...props
}) => {
  const finalClassName = useMemo(() => {
    const classes: (string | undefined)[] = [];

    classes.push('text_pole');

    return classes.filter(Boolean).join(' ');
  }, [overrideDefaults, className]);
  return (
    <>
      <input type="text" className={finalClassName} value={value} onChange={onChange} list={listId} {...props} />
      <datalist id={listId}>
        {options.map((option, index) => (
          <option key={index} value={option} />
        ))}
      </datalist>
    </>
  );
};
