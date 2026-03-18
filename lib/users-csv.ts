type ParsedUser = {
  name: string
  email: string
}

type ExportUser = {
  created_at: string
  display_name: string | null
  email: string
  role: string
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ""
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ""
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  return rows
}

function parseUsersCsv(text: string): ParsedUser[] {
  const rows = parseCsvRows(text.trim())
  if (rows.length < 2) return []

  const headers = rows[0].map((header) => header.trim().toLowerCase())
  const nameIndex = headers.findIndex((header) => header === "name")
  const emailIndex = headers.findIndex((header) => header === "email")

  if (emailIndex === -1) return []

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => ({
      name: nameIndex === -1 ? "" : (row[nameIndex] ?? "").trim(),
      email: (row[emailIndex] ?? "").trim(),
    }))
    .filter((row) => row.email.length > 0)
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function buildUsersCsv(users: ExportUser[], now = new Date()) {
  const headers = ["name", "email", "role", "joined"]
  const rows = users.map((user) => [
    user.display_name ?? "",
    user.email,
    user.role,
    new Date(user.created_at).toISOString().split("T")[0],
  ])

  return {
    csv: [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
      .join("\n"),
    filename: `users-${now.toISOString().split("T")[0]}.csv`,
  }
}

export { buildUsersCsv, parseUsersCsv }
