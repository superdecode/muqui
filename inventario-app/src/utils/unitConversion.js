/**
 * Build a lookup map from an array of equivalence docs.
 * Returns Map<string, Map<string, number>> where key = fromUnitId, inner key = toUnitId, value = factor.
 * Automatically includes bidirectional entries.
 */
export function buildEquivalenceMap(equivalences = []) {
  const map = new Map()
  const ensure = (id) => { if (!map.has(id)) map.set(id, new Map()) }

  for (const eq of equivalences) {
    const { from_unit_id, to_unit_id, factor } = eq
    if (!from_unit_id || !to_unit_id || !factor) continue
    ensure(from_unit_id)
    ensure(to_unit_id)
    map.get(from_unit_id).set(to_unit_id, factor)
    map.get(to_unit_id).set(from_unit_id, 1 / factor)
  }

  for (const [unitId, inner] of map) {
    inner.set(unitId, 1)
  }
  return map
}

/**
 * Convert a value from one unit to another using the equivalence map.
 * Supports direct conversion and single-hop transitive conversion (A->B->C).
 * Returns null if no path exists.
 */
export function convertUnits(value, fromUnitId, toUnitId, equivalenceMap) {
  if (fromUnitId === toUnitId) return value
  const fromMap = equivalenceMap.get(fromUnitId)
  if (fromMap?.has(toUnitId)) {
    return value * fromMap.get(toUnitId)
  }
  if (fromMap) {
    for (const [midId, factorToMid] of fromMap) {
      const midMap = equivalenceMap.get(midId)
      if (midMap?.has(toUnitId)) {
        return value * factorToMid * midMap.get(toUnitId)
      }
    }
  }
  return null
}

/**
 * Get all unit IDs that are reachable (have equivalence) from the given unit.
 * Always includes the unit itself.
 */
export function getCompatibleUnits(unitId, equivalenceMap) {
  const direct = equivalenceMap.get(unitId)
  if (!direct) return [unitId]
  return [unitId, ...Array.from(direct.keys()).filter(id => id !== unitId)]
}

/**
 * Calculate cost per consumption unit.
 * costPerPurchaseUnit / purchaseUnitQty / conversionFactor
 */
export function calcCostInConsumptionUnit(costPerPurchaseUnit, purchaseUnitQty, fromUnitId, toUnitId, equivalenceMap) {
  if (!purchaseUnitQty || purchaseUnitQty === 0) return 0
  const factor = convertUnits(1, fromUnitId, toUnitId, equivalenceMap)
  if (factor === null) return 0
  return (costPerPurchaseUnit / purchaseUnitQty) / factor
}
