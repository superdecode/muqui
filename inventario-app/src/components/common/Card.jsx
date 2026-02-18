export default function Card({ title, children, className = '', actions }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
