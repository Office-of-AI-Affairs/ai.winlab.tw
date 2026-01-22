import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

const competitionData = [
  {
    id: 1,
    image: "/placeholder.png",
    title: "Google",
    date: "1998-09-04",
    link: "https://www.google.com",
  },
  {
    id: 2,
    image: "/placeholder.png",
    title: "Google",
    date: "1998-09-04",
    link: "https://www.google.com",
  },
  {
    id: 3,
    image: "/placeholder.png",
    title: "Google",
    date: "1998-09-04",
    link: "https://www.google.com",
  },
  {
    id: 4,
    image: "/placeholder.png",
    title: "Google",
    date: "1998-09-04",
    link: "https://www.google.com",
  },
  {
    id: 5,
    image: "/placeholder.png",
    title: "Google",
    date: "1998-09-04",
    link: "https://www.google.com",
  },
  {
    id: 6,
    image: "/placeholder.png",
    title: "Google",
    date: "1998-09-04",
    link: "https://www.google.com",
  },
]

export function HomeCompetition() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-6">
      <h2 className="text-2xl font-bold">競賽資訊</h2>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
        {competitionData.slice(0, 6).map((item) => (
          <Link href={item.link} key={item.id} target="_blank">
            <Card className="py-0 hover:scale-102 transition-all duration-200">
              <div className="relative w-full aspect-video">
                <Image src={item.image} alt={item.title} fill className="object-cover rounded-t-lg" />
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">{item.title}</CardTitle>
                <CardDescription className="text-right">{item.date}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <div className="flex justify-center">
        <Link href="/competition">
          <Button variant="secondary" size="lg" className="px-12 text-lg">探索更多</Button>
        </Link>
      </div>
    </div>
  )
}