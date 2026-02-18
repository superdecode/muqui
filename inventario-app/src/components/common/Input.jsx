export default function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:cursor-not-allowed
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
