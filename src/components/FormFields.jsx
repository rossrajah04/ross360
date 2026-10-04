// Small accessible form building blocks. Each field has a visible <label>, optional hint text,
// and an error message linked with aria-describedby / aria-invalid.

function describedBy(id, hint, error) {
  const ids = [];
  if (hint) ids.push(`${id}-hint`);
  if (error) ids.push(`${id}-error`);
  return ids.length ? ids.join(' ') : undefined;
}

function FieldShell({ id, label, required, hint, error, children }) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="field__optional"> (optional)</span>
        )}
      </label>
      {hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ id, name = id, label, required, hint, error, type = 'text', ...rest }) {
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <input
        className="input"
        id={id}
        name={name}
        type={type}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({ id, name = id, label, required, hint, error, rows = 4, ...rest }) {
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        className="input"
        id={id}
        name={name}
        rows={rows}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({ id, name = id, label, required, hint, error, options, placeholder, ...rest }) {
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <select
        className="input"
        id={id}
        name={name}
        defaultValue=""
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      >
        <option value="">{placeholder || 'Select…'}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function RadioGroup({ name, legend, required, error, options, defaultValue, className = '' }) {
  const errorId = `${name}-error`;
  return (
    <fieldset
      className={`field fieldset${error ? ' field--error' : ''} ${className}`.trim()}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="field__label">
        {legend}
        {required ? (
          <span className="field__required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </legend>
      <div className="radio-list">
        {options.map((option) => (
          <label key={option.value} className="radio">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              aria-invalid={error ? true : undefined}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="field__error" id={errorId}>
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
