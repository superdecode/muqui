export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizes[size]} border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
      {text && (
        <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm">{text}</p>
      )}
    </div>
  )
}
