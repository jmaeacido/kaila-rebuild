import type { InputHTMLAttributes } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  error?: string;
  hint?: string;
  id: string;
  label: string;
};

export const TextField = ({ error, hint, id, label, ...props }: TextFieldProps) => {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="kaila-field">
      <label className="kaila-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...props}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className="kaila-field__input"
        id={id}
      />
      {error ? (
        <p className="kaila-field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="kaila-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};
