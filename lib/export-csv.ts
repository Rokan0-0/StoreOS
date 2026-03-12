// lib/export-csv.ts

export function generateCSV(rows: string[][]): string {
  return rows
    .map(row =>
      row.map(cell =>
        cell.includes(',') || cell.includes('\n')
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ).join(',')
    )
    .join('\n')
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
