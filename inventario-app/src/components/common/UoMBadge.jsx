// src/components/common/UoMBadge.jsx
/**
 * UoMBadge — displays the purchase unit of measure for a product.
 * Props:
 *   qty        {number|string}  — purchase_unit_qty (e.g. 3)
 *   symbol     {string}         — unit abreviatura/symbol (e.g. "Kg")
 *   unitName   {string}         — fallback unit name (e.g. "Kilogramo")
 *   size       {"sm"|"md"}      — "sm" for tables, "md" for modals/cards
 */
export default function UoMBadge({ qty, symbol, unitName, size = 'sm' }) {
  const label = symbol || unitName
  if (!label && !qty) {
    return <span className="text-slate-400 dark:text-slate-500 font-medium">—</span>
  }

  const numQty = parseFloat(qty)
  const displayQty = !isNaN(numQty) && numQty > 0 ? numQty : null
  const text = displayQty && label
    ? `${displayQty} ${label}`
    : label || (displayQty ? String(displayQty) : '—')

  const sizeClasses = size === 'md'
    ? 'px-3 py-1 text-sm'
    : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm whitespace-nowrap`}>
      {text}
    </span>
  )
}
