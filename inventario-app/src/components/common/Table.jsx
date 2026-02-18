export default function Table({ columns, data, onRowClick, className = '', rowClassName }) {
  const getRowClasses = (row) => {
    const baseClass = onRowClick ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'
    const customClass = typeof rowClassName === 'function' ? rowClassName(row) : ''
    return `${baseClass} ${customClass}`
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
              >
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={getRowClasses(row)}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100"
                  >
                    {column.render
                      ? column.render(row[column.accessor], row)
                      : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
