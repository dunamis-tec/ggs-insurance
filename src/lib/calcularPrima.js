/**
 * Calculates prima breakdown.
 * @param {number} prima_neta
 * @param {number} pct_gasto  - e.g. 5 for 5%
 * @param {number} pct_recargo - e.g. 3 for 3%, 0 if contado
 */
export function calcularPrima(prima_neta, pct_gasto, pct_recargo) {
  const n = parseFloat(prima_neta) || 0
  const gasto   = r2(n * (parseFloat(pct_gasto)   || 0) / 100)
  const recargo = r2(n * (parseFloat(pct_recargo)  || 0) / 100)
  const iva     = r2((n + gasto + recargo) * 0.12)
  const total   = r2(n + gasto + recargo + iva)
  return { prima_neta: n, monto_gasto_emision: gasto, monto_recargo: recargo, monto_iva: iva, prima_total: total }
}
function r2(n) { return Math.round(n * 100) / 100 }
