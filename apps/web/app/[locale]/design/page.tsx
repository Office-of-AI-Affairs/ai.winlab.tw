import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import {
  AlertDialogDemo,
  CheckboxDemo,
  CollapsibleDemo,
  DialogDemo,
  PopoverDemo,
  SelectDemo,
  SubButtonDemo,
  ToastDemo,
} from "./interactive";
import { DesignSidebar } from "./sidebar";

function Swatch({ name, className, textClassName }: { name: string; className: string; textClassName?: string }) {
  return (
    <div className={`h-20 rounded-xl border border-border flex items-end p-3 ${className}`}>
      <span className={`text-xs font-medium ${textClassName ?? ""}`}>{name}</span>
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-16">
        <h1 className="text-5xl tracking-tight" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Design System
        </h1>
        <p className="text-lg text-muted-foreground mt-3">ai.winlab.tw 的設計基礎</p>
      </div>

      <div className="lg:flex lg:gap-12">
        <DesignSidebar />

        <div className="flex-1 min-w-0 flex flex-col gap-20">
          {/* ── 色彩 ── */}
          <section className="flex flex-col gap-6">
            <h2 id="colors" className="text-2xl font-bold scroll-mt-24">色彩</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Swatch name="Primary" className="bg-primary col-span-2" textClassName="text-primary-foreground" />
              <Swatch name="Background" className="bg-background" textClassName="text-foreground" />
              <Swatch name="Foreground" className="bg-foreground" textClassName="text-background" />
              <Swatch name="Card" className="bg-card" textClassName="text-card-foreground" />
              <Swatch name="Muted" className="bg-muted" textClassName="text-muted-foreground" />
              <Swatch name="Secondary" className="bg-secondary" textClassName="text-secondary-foreground" />
              <Swatch name="Destructive" className="bg-destructive" textClassName="text-white" />
              <Swatch name="Border" className="bg-border" />
              <Swatch name="Ring" className="bg-ring" textClassName="text-white" />
            </div>
          </section>

          {/* ── 字型 ── */}
          <section className="flex flex-col gap-6">
            <h2 id="typography" className="text-2xl font-bold scroll-mt-24">字型</h2>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Noto Sans — 介面</p>
                <p className="font-sans text-2xl">The quick brown fox jumps over the lazy dog</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Noto Sans Mono — 程式碼</p>
                <p className="font-mono text-2xl">const hello = &quot;world&quot;;</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Instrument Serif — 裝飾</p>
                <p className="text-2xl" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 prose max-w-none">
              <h1>Heading 1</h1>
              <h2 className="!border-0 !mt-0 !pb-0">Heading 2</h2>
              <h3 className="!mt-0">Heading 3</h3>
              <h4 className="!mt-0">Heading 4</h4>
            </div>
          </section>

          {/* ── 圓角 ── */}
          <section className="flex flex-col gap-6">
            <h2 id="spacing" className="text-2xl font-bold scroll-mt-24">圓角</h2>
            <div className="flex gap-8 items-end flex-wrap">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 border-2 border-primary rounded-sm" />
                <span className="text-sm font-mono">1rem</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 border-2 border-primary rounded-lg" />
                <span className="text-sm font-mono">2rem</span>
              </div>
            </div>
          </section>

          {/* ── 元件 ── */}
          <section className="flex flex-col gap-10">
            <h2 id="components" className="text-2xl font-bold scroll-mt-24">元件</h2>

            <div className="flex flex-wrap gap-3 items-center">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button size="icon"><Star /></Button>
              <Button disabled>已停用</Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">基本卡片</p>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>卡片標題</CardTitle>
                  <CardDescription>卡片描述文字</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">卡片內容區域。</p>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                  <Button variant="outline" size="sm">取消</Button>
                  <Button size="sm">儲存</Button>
                </CardFooter>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Block variant="outline"><span className="text-sm">Outline</span></Block>
              <Block variant="ghost"><span className="text-sm">Ghost</span></Block>
            </div>

            <div className="flex flex-col gap-2 max-w-xs">
              <Label htmlFor="input-demo">標籤</Label>
              <Input id="input-demo" placeholder="輸入文字..." />
            </div>

            <div className="max-w-md flex flex-col gap-2">
              <Label htmlFor="textarea-demo">標籤</Label>
              <Textarea id="textarea-demo" placeholder="輸入較長的文字..." />
            </div>

            <SelectDemo />
            <CheckboxDemo />
            <DialogDemo />
            <AlertDialogDemo />
            <PopoverDemo />

            <div className="flex items-center gap-3">
              <Avatar size="xl">
                <AvatarImage src="/og.png" alt="Demo" />
                <AvatarFallback>OG</AvatarFallback>
              </Avatar>
              <Avatar size="xl">
                <AvatarFallback>LK</AvatarFallback>
              </Avatar>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名稱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: "Alice", role: "Admin" },
                    { name: "Bob", role: "Vendor" },
                    { name: "Charlie", role: "User" },
                  ].map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">編輯</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-3 max-w-sm">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>

            <SubButtonDemo />
            <CollapsibleDemo />
          </section>

          {/* ── 模式 ── */}
          <section className="flex flex-col gap-10">
            <h2 id="patterns" className="text-2xl font-bold scroll-mt-24">模式</h2>

            <div className="interactive-scale w-24 h-24 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm cursor-pointer select-none">
              Hover me
            </div>

            <div className="flex gap-6">
              <span className="nav-bracket relative text-sm font-medium cursor-pointer">Hover me</span>
              <span className="nav-bracket nav-bracket-active relative text-sm font-medium cursor-pointer">Active</span>
            </div>

            <div className="text-center py-8 text-muted-foreground border rounded-xl border-dashed">
              尚無公告
            </div>

            <div className="flex gap-3">
              <Badge>已發布</Badge>
              <Badge variant="secondary">草稿</Badge>
            </div>

            <ToastDemo />

            <div className="flex gap-4">
              <AppLink href="/" className="text-sm text-primary underline underline-offset-4">
                內部連結 →
              </AppLink>
              <AppLink href="https://ai.winlab.tw" className="text-sm text-primary underline underline-offset-4">
                外部連結 ↗
              </AppLink>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
