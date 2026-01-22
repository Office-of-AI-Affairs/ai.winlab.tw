import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const announcementData = [
  {
    id: 1,
    date: "2025-11-10",
    category: "教發中心",
    title: "【招募】114-2 ideaNCU創意社群熱血開跑嚕！課程提出自主學習計劃，補助最高1萬元～",
  },
  {
    id: 2,
    date: "2025-10-22",
    category: "教發中心",
    title: "【公告】114-1 ideaNCU創意社群期初審查結果出爐嚕！",
  },
  {
    id: 3,
    date: "2025-10-15",
    category: "教發中心",
    title: "【公告】114-1 ideaNCU創意社群期初審查結果出爐嚕！",
  },
  {
    id: 4,
    date: "2025-10-10",
    category: "教發中心",
    title: "【公告】114-1 ideaNCU創意社群期初審查結果出爐嚕！",
  },
  {
    id: 5,
    date: "2025-10-05",
    category: "教發中心",
    title: "【公告】114-1 ideaNCU創意社群期初審查結果出爐嚕！",
  },
]

export default async function AnnouncementPage() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-8 mt-8">
      <h1 className="text-3xl font-bold w-full text-center">最新公告</h1>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead className="text-base font-bold">公告日期</TableHead>
            <TableHead className="text-base font-bold">類別</TableHead>
            <TableHead className="text-base font-bold">標題</TableHead>
            <TableHead className="text-base text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcementData.slice(0, 5).map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-base">{item.date}</TableCell>
              <TableCell className="text-base">{item.category}</TableCell>
              <TableCell className="text-base">{item.title}</TableCell>
              <TableCell className="text-base text-right">
                <Button className="px-4">查看</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}