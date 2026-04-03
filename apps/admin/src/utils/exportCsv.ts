export function exportToCsv(filename: string, rows: Record<string, any>[], columns: { header: string; key: string }[]) {
  const headers = columns.map(c => c.header)
  const data = rows.map(row =>
    columns.map(c => {
      const val = c.key.split('.').reduce((obj: any, k) => obj?.[k], row)
      if (val === null || val === undefined) return ''
      return String(val).replace(/"/g, '""')
    })
  )
  const csv = [headers, ...data]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
