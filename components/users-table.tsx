"use client"

import { Download, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type UserRow = {
  id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
}

type ImportResult = {
  created: number
  skipped: number
  errors: string[]
}

function UsersTable({
  users,
  roleLabel,
  isImporting,
  importResult,
  onExport,
  onImportClick,
}: {
  users: UserRow[]
  roleLabel: Record<string, string>
  isImporting: boolean
  importResult: ImportResult | null
  onExport: () => void
  onImportClick: () => void
}) {
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">用戶管理</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={users.length === 0}
          >
            <Download className="h-4 w-4" />
            匯出 CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImportClick}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "匯入中…" : "匯入 CSV"}
          </Button>
        </div>
      </div>

      {importResult && (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 flex flex-col gap-1 rounded-xl border bg-muted/40 px-4 py-3 text-sm"
        >
          <p className="font-medium">
            匯入完成：成功建立 {importResult.created} 位，跳過 {importResult.skipped} 位重複用戶
          </p>
          {importResult.errors.length > 0 && (
            <ul className="list-inside list-disc text-destructive">
              {importResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            新用戶需透過「忘記密碼」設定自己的密碼後才能登入。
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="h-12 bg-muted/40">
              <TableHead className="px-4 py-3 text-left font-semibold">姓名</TableHead>
              <TableHead className="px-4 py-3 text-left font-semibold">電子信箱</TableHead>
              <TableHead className="px-4 py-3 text-left font-semibold">角色</TableHead>
              <TableHead className="px-4 py-3 text-left font-semibold">加入時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/30">
                <TableCell className="px-4 py-3">
                  {user.display_name || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{user.email}</TableCell>
                <TableCell className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      user.role === "admin"
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {roleLabel[user.role] ?? user.role}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString("zh-TW", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">尚無用戶資料</div>
        )}
      </div>

      <p className="mt-4 text-right text-xs text-muted-foreground">共 {users.length} 位用戶</p>

      <div className="mt-8 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">CSV 匯入格式</p>
        <pre className="font-mono leading-relaxed">
          name,email{"\n"}
          張三,zhang3@example.com{"\n"}
          李四,li4@example.com
        </pre>
        <p className="mt-2">
          僅需 <code className="rounded bg-muted px-1">name</code> 與{" "}
          <code className="rounded bg-muted px-1">email</code> 欄位。重複 email
          自動跳過，新用戶預設為一般用戶，需透過「忘記密碼」設定密碼。
        </p>
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

      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="h-12 bg-muted/40">
              <TableHead className="px-4 py-3">
                <Skeleton className="h-4 w-10" />
              </TableHead>
              <TableHead className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="px-4 py-3">
                <Skeleton className="h-4 w-10" />
              </TableHead>
              <TableHead className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-48 max-w-full" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-right text-xs text-muted-foreground">
        <Skeleton className="ml-auto h-4 w-20" />
      </p>

      <div className="mt-8 rounded-xl border bg-muted/20 px-4 py-3">
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-4 w-60 max-w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  )
}

export { UsersTable, UsersTableSkeleton }
