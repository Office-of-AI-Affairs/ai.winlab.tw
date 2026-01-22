import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import Image from "next/image"

const competitionData = [
  {
    id: 1,
    image: "/placeholder.png",
    title: "｛關係樣本｝影展—《金魚缸小姐》、《二號球衣》",
    date: "2025-08-01",
    description: "中大性別小彩坊此次邀請《二號球衣》、《金魚缸小姐》兩部短片及導演-巫虹儀至中央大學進行映後座談。《金魚缸小姐》直面女同志情慾，突破台灣影視",
  },
  {
    id: 2,
    image: "/placeholder.png",
    title: "跨性別互動講座",
    date: "2025-01-01",
    description: "跨越：自由之身 跨性別互動講座本次的互動講座我們邀請到北市大性／別研究社的社長",
  },
  {
    id: 3,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2025-01-01",
    description: "Card Description",
  },
  {
    id: 4,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2025-01-01",
    description: "Card Description",
  },
  {
    id: 5,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2025-01-01",
    description: "Card Description",
  },
  {
    id: 6,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2025-01-01",
    description: "Card Description",
  },
]

export default async function CompetitionPage() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-8 mt-8">
      <h1 className="text-3xl font-bold w-full text-center">競賽資訊</h1>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
        {competitionData.slice(0, 6).map((item) => (
          <Card key={item.id} className="py-0 hover:scale-102 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex justify-center">
                <Image src={item.image} alt={item.title} width={300} height={300} />
              </div>
              <CardTitle className="text-xl font-bold">{item.title}</CardTitle>
              <CardDescription className="text-right">{item.date}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}