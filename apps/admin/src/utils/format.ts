export function formatMoney(n: number, currency = 'GTQ', locale = 'es-GT') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatPercent(n: number, decimals = 0) {
  return `${n.toFixed(decimals)}%`
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const AVATAR_PALETTE: [string, string][] = [
  ['#dbeafe', '#1e40af'],
  ['#fef3c7', '#92400e'],
  ['#fee2e2', '#991b1b'],
  ['#dcfce7', '#166534'],
  ['#e0e7ff', '#3730a3'],
  ['#fce7f3', '#9f1239'],
  ['#f3e8ff', '#6b21a8'],
  ['#fef9c3', '#854d0e'],
]

export function getAvatarColors(seed: string): { bg: string; fg: string } {
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  const [bg, fg] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
  return { bg, fg }
}
