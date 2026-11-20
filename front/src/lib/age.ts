// Contrôle d'âge côté interface (le serveur refait le calcul et fait foi).

export const MIN_AGE = 18

/** Date du jour au format AAAA-MM-JJ, dans le fuseau du navigateur. */
export function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Âge en années révolues ; null si la date est invalide. */
export function ageFrom(birthIso: string, todayIsoValue = todayIso()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso)
  if (!match) return null
  const [y, m, d] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  const [ty, tm, td] = todayIsoValue.split('-').map(Number)
  let age = ty - y
  if (tm < m || (tm === m && td < d)) age -= 1
  return age
}

/** Message d'erreur du champ date de naissance, ou undefined si elle est acceptable. */
export function birthDateError(value: string): string | undefined {
  if (!value) return 'Renseigne ta date de naissance.'
  const age = ageFrom(value)
  if (age === null) return 'Date de naissance invalide.'
  if (value > todayIso()) return 'La date ne peut pas être dans le futur.'
  if (age < MIN_AGE) return 'HeavenCases est réservé aux personnes majeures : il faut avoir 18 ans ou plus.'
  return undefined
}
