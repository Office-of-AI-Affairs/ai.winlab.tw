"use client"

import { useState, useMemo } from "react"
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, Download, Pencil, Plus, Trash2, Upload, UserPlus, X } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/date"
import { useT } from "@/lib/i18n/locale-provider"
import type { Dictionary } from "@/lib/i18n/dictionary"

export type UserRow = {
  id: string
  email: string
  display_name: string | null
  role: "admin" | "user" | "vendor" | "member"
  created_at: string
  tags: string[]
}

export type ImportResult = {
  created: number
  skipped: number
  errors: string[]
}

function SortableHeader({
  column,
  children,
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" }
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 font-semibold hover:text-foreground transition-colors duration-200"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      <ArrowUpDown className="size-3.5 text-muted-foreground" />
    </button>
  )
}

function TagCell({
  tags,
  userId,
  allTags,
  onAddTag,
  onRemoveTag,
}: {
  tags: string[]
  userId: string
  allTags: string[]
  onAddTag: (userId: string, tag: string) => void
  onRemoveTag: (userId: string, tag: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")

  const suggestions = allTags.filter(
    (t) => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase())
  )

  function handleAdd(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onAddTag(userId, trimmed)
    setInput("")
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => onRemoveTag(userId, tag)}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors duration-200"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 p-0.5 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors duration-200"
          >
            <Plus className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="start">
          <Input
            placeholder={t.admin.users.tagInputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAdd(input)
              }
            }}
            className="h-8 text-sm"
          />
          {suggestions.length > 0 && (
            <div className="mt-1.5 flex max-h-32 flex-col gap-0.5 overflow-y-auto">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded px-2 py-1 text-left text-sm hover:bg-accent transition-colors duration-200"
                  onClick={() => {
                    handleAdd(tag)
                    setOpen(false)
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function createColumns({
  t,
  roleLabel,
  allTags,
  onEditUser,
  onDeleteUser,
  onAddTag,
  onRemoveTag,
}: {
  t: Dictionary
  roleLabel: Record<string, string>
  allTags: string[]
  onEditUser?: (user: UserRow) => void
  onDeleteUser?: (user: UserRow) => void
  onAddTag: (userId: string, tag: string) => void
  onRemoveTag: (userId: string, tag: string) => void
}): ColumnDef<UserRow>[] {
  return [
    {
      accessorKey: "display_name",
      header: ({ column }) => <SortableHeader column={column}>{t.common.name}</SortableHeader>,
      cell: ({ row }) =>
        row.original.display_name || (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column}>{t.common.email}</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader column={column}>{t.admin.users.columns.role}</SortableHeader>,
      cell: ({ row }) => {
        const role = row.original.role
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              role === "admin"
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {roleLabel[role] ?? role}
          </span>
        )
      },
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true
        return row.original.role === filterValue
      },
    },
    {
      accessorKey: "tags",
      header: t.admin.users.columns.tags,
      cell: ({ row }) => (
        <TagCell
          tags={row.original.tags ?? []}
          userId={row.original.id}
          allTags={allTags}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
        />
      ),
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true
        const tags = row.original.tags ?? []
        return tags.some((t) =>
          t.toLowerCase().includes((filterValue as string).toLowerCase())
        )
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <SortableHeader column={column}>{t.admin.users.columns.joined}</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.created_at, "long")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onEditUser && (
            <button
              type="button"
              aria-label={t.admin.users.editUser}
              onClick={() => onEditUser(row.original)}
              className="rounded p-1 hover:bg-muted transition-colors duration-200"
            >
              <Pencil className="size-4 text-muted-foreground" />
            </button>
          )}
          {onDeleteUser && (
            <button
              type="button"
              aria-label={t.admin.users.deleteAria}
              onClick={() => onDeleteUser(row.original)}
              className="rounded p-1 hover:bg-destructive/10 transition-colors duration-200"
            >
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      ),
      size: 80,
    },
  ]
}

function UsersTable({
  users,
  isImporting,
  importResult,
  onExport,
  onImportClick,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onAddTag,
  onRemoveTag,
}: {
  users: UserRow[]
  isImporting: boolean
  importResult: ImportResult | null
  onExport: () => void
  onImportClick: () => void
  onCreateUser?: () => void
  onEditUser?: (user: UserRow) => void
  onDeleteUser?: (user: UserRow) => void
  onAddTag: (userId: string, tag: string) => void
  onRemoveTag: (userId: string, tag: string) => void
}) {
  const t = useT()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const roleLabel = useMemo<Record<string, string>>(
    () => ({
      admin: t.admin.users.roles.admin,
      user: t.admin.users.roles.user,
      vendor: t.admin.users.roles.vendor,
      member: t.admin.users.roles.member,
    }),
    [t]
  )

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) {
      for (const tag of u.tags ?? []) set.add(tag)
    }
    return Array.from(set).sort()
  }, [users])

  const columns = useMemo(
    () => createColumns({ t, roleLabel, allTags, onEditUser, onDeleteUser, onAddTag, onRemoveTag }),
    [t, roleLabel, allTags, onEditUser, onDeleteUser, onAddTag, onRemoveTag]
  )

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = (filterValue as string).toLowerCase()
      const { display_name, email, role, tags } = row.original
      return (
        (display_name ?? "").toLowerCase().includes(search) ||
        email.toLowerCase().includes(search) ||
        (roleLabel[role] ?? role).toLowerCase().includes(search) ||
        (tags ?? []).some((t) => t.toLowerCase().includes(search))
      )
    },
  })

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.admin.users.title}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={users.length === 0}
          >
            <Download data-icon="inline-start" />
            {t.admin.users.exportCsv}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImportClick}
            disabled={isImporting}
          >
            <Upload data-icon="inline-start" />
            {isImporting ? t.admin.users.importing : t.admin.users.importCsv}
          </Button>
          {onCreateUser && (
            <Button size="sm" onClick={onCreateUser}>
              <UserPlus data-icon="inline-start" />
              {t.admin.users.createUser}
            </Button>
          )}
        </div>
      </div>

      {importResult && (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 flex flex-col gap-1 rounded-xl border bg-muted/40 px-4 py-3 text-sm"
        >
          <p className="font-medium">
            {t.admin.users.importResult.summary
              .replace("{created}", String(importResult.created))
              .replace("{skipped}", String(importResult.skipped))}
          </p>
          {importResult.errors.length > 0 && (
            <ul className="list-inside list-disc text-destructive">
              {importResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {t.admin.users.importResult.passwordHint}
          </p>
        </div>
      )}

      <div className="mb-4">
        <Input
          placeholder={t.admin.users.searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="h-12 bg-muted/40">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-3 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {globalFilter ? t.admin.users.empty.noMatch : t.admin.users.empty.none}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-right text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length !== users.length
          ? t.admin.users.count.filtered
              .replace("{shown}", String(table.getFilteredRowModel().rows.length))
              .replace("{total}", String(users.length))
          : t.admin.users.count.total.replace("{total}", String(users.length))}
      </p>

      <div className="mt-8 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">{t.admin.users.csvHelp.title}</p>
        <pre className="font-mono leading-relaxed">
          name,email{"\n"}
          {t.admin.users.csvHelp.sampleRows}
        </pre>
        <p className="mt-2">{t.admin.users.csvHelp.body}</p>
      </div>
    </>
  )
}

function UsersTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div data-slot="users-table-skeleton">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="mb-4">
        <Skeleton className="h-9 w-80 max-w-full rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="h-12 bg-muted/40">
              <TableHead className="py-3"><Skeleton className="h-4 w-10" /></TableHead>
              <TableHead className="py-3"><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead className="py-3"><Skeleton className="h-4 w-10" /></TableHead>
              <TableHead className="py-3"><Skeleton className="h-4 w-12" /></TableHead>
              <TableHead className="py-3"><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="py-3"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="py-3"><Skeleton className="h-4 w-48 max-w-full" /></TableCell>
                <TableCell className="py-3"><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell className="py-3"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell className="py-3"><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-right text-xs text-muted-foreground">
        <Skeleton className="ml-auto h-4 w-20" />
      </div>
    </div>
  )
}

export { UsersTable, UsersTableSkeleton }
