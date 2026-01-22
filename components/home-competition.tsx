import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import Image from "next/image";
import { Button } from "./ui/button";

const competitionData = [
  {
    id: 1,
    image: "/placeholder.png",
    title: "Google",
    date: "2002-11-21",
    link: "https://www.google.com",
  },
  {
    id: 2,
    image: "/placeholder.png",
    title: "Google",
    date: "2002-11-21",
    link: "https://www.google.com",
  },
  {
    id: 3,
    image: "/placeholder.png",
    title: "Google",
    date: "2002-11-21",
    link: "https://www.google.com",
  },
  {
    id: 4,
    image: "/placeholder.png",
    title: "Google",
    date: "2002-11-21",
    link: "https://www.google.com",
  },
  {
    id: 5,
    image: "/placeholder.png",
    title: "Google",
    date: "2002-11-21",
    link: "https://www.google.com",
  },
  {
    id: 6,
    image: "/placeholder.png",
    title: "Google",
    date: "2002-11-21",
    link: "https://www.google.com",
  },
]

export function HomeCompetition() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-6">
      <h2 className="text-2xl font-bold">競賽資訊</h2>
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
      <div className="flex justify-center">
        <Button size="lg" className="px-12 text-lg">探索更多</Button>
      </div>
    </div>
  )
}