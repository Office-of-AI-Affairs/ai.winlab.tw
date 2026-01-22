import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import Link from "next/link"

const resultData = [
  {
    id: 1,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2026-01-01",
    description: "Card Description",
  },
  {
    id: 2,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2026-01-01",
    description: "Card Description",
  },
  {
    id: 3,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2026-01-01",
    description: "Card Description",
  },
  {
    id: 4,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2026-01-01",
    description: "Card Description",
  },
  {
    id: 5,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2026-01-01",
    description: "Card Description",
  },
  {
    id: 6,
    image: "/placeholder.png",
    title: "Card Title",
    date: "2026-01-01",
    description: "Card Description",
  },
]

export default async function ResultPage() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-8 mt-8">
      <h1 className="text-3xl font-bold w-full text-center">最新成果</h1>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
        {resultData.map((item) => (
          <Link href={`/result/${item.id}`} key={item.id} className="h-full">
            <Card className="py-0 h-full flex flex-col hover:scale-102 transition-all duration-200">
              <div className="relative w-full aspect-video shrink-0">
                <Image src={item.image} alt={item.title} fill className="object-cover rounded-t-lg" />
              </div>
              <CardHeader className="shrink-0">
                <CardTitle className="text-xl font-bold line-clamp-2">{item.title}</CardTitle>
                <CardDescription className="text-right">{item.date}</CardDescription>
                <Separator />
              </CardHeader>
              <CardContent className="flex-1">
                <p className="line-clamp-3">{item.description}</p>
              </CardContent>
              <CardFooter />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}