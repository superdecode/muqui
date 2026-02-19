import { useState, useMemo, useEffect } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [50, 100, 500]

// Sort icon for column headers
function SortIcon({ direction }) {
  if (direction === 'asc') {
    return <ChevronUp size={14} className="text-primary-600 flex-shrink-0" />
  }
  if (direction === 'desc') {
    return <ChevronDown size={14} className="text-primary-600 flex-shrink-0" />
  }
  return <ChevronsUpDown size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
}

// Smart value comparator: handles dates, strings, numbers, nulls
function compareValues(a, b, key) {
  const va = a[key]
  const vb = b[key]

  if (va == null && vb == null) return 0
  if (va == null) return 1
  if (vb == null) return -1

  if (typeof va === 'string') {
    // Detect ISO date-like strings (Firestore Timestamps converted to ISO or numeric)
    const dateA = new Date(va)
    const dateB = new Date(vb)
    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      return dateA.getTime() - dateB.getTime()
    }
    return va.toLowerCase().localeCompare(vb.toLowerCase(), 'es', { sensitivity: 'base' })
  }

  // Firestore Timestamp objects {seconds, nanoseconds}
  if (typeof va === 'object' && va?.seconds != null) {
    return va.seconds - (vb?.seconds ?? 0)
  }

  if (typeof va === 'number') return va - vb

  return 0
}

// Generate visible page numbers with ellipsis
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function DataTable({
  columns,
  data,
  onRowClick,
  className = '',
  rowClassName,
  defaultSortKey = null,
  defaultSortDir = 'desc',
}) {
  // Sorting state — seeded from props on mount only
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState(defaultSortKey ? defaultSortDir : null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Reset to page 1 whenever the source data changes (filter/tab change)
  useEffect(() => {
    setPage(1)
  }, [data])

  // Cycle: null → asc → desc → null
  const handleSort = (key) => {
    if (!key) return
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else if (sortDir === 'desc') {
        setSortKey(null)
        setSortDir(null)
      } else {
        setSortDir('asc')
      }
    }
    setPage(1)
  }

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize))
    setPage(1)
  }

  // Apply sorting in-memory
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const cmp = compareValues(a, b, sortKey)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  // Pagination math
  const totalRecords = sortedData.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const pageData = sortedData.slice(startIndex, endIndex)
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  const getRowClasses = (row) => {
    const base = onRowClick
      ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer'
      : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'
    const custom = typeof rowClassName === 'function' ? rowClassName(row) : ''
    return `${base} ${custom}`
  }

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {columns.map((col, idx) => {
                const isSortable = Boolean(col.sortKey)
                const isActive = isSortable && sortKey === col.sortKey
                return (
                  <th
                    key={idx}
                    onClick={isSortable ? () => handleSort(col.sortKey) : undefined}
                    className={[
                      'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider select-none',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-500 dark:text-slate-400',
                      isSortable
                        ? 'cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                        : '',
                    ].join(' ')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {isSortable && (
                        <SortIcon direction={isActive ? sortDir : null} />
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIdx) => (
                <tr
                  key={row.id ?? rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={getRowClasses(row)}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100"
                    >
                      {col.render
                        ? col.render(row[col.accessor], row)
                        : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {/* Records per page + info */}
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className="px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>por página</span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-500">|</span>
            <span className="hidden sm:inline">
              Mostrando <strong className="text-slate-800 dark:text-slate-200">{startIndex + 1}–{endIndex}</strong> de{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalRecords}</strong> registros
            </span>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            {/* First */}
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Primera página"
            >
              <ChevronsLeft size={16} />
            </button>
            {/* Previous */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page numbers */}
            {pageNumbers.map((num, idx) =>
              num === '...' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-slate-400 dark:text-slate-500 text-sm select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={[
                    'min-w-[32px] px-2 py-1 rounded-lg text-sm font-medium transition-colors',
                    num === currentPage
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
                  ].join(' ')}
                >
                  {num}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
            {/* Last */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Última página"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
