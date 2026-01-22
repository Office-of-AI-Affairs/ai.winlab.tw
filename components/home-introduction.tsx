import { Button } from "@/components/ui/button";

export function HomeIntroduction() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-4">
      <h2 className="text-2xl font-bold">國立陽明交通大學人工智慧專責辦公室</h2>
      <p className="text-lg text-muted-foreground">
        零程式基礎也能上手，專注架構與應用而非深度程式開發雲端、核心伺服器、邊緣運算多面向培訓理論 × 實作，全面掌握 AI 系統規劃與落地產業導向，培養整合 AI 解決方案的實戰力
      </p>
      <div className="flex justify-center">
        <Button size="lg" className="px-12 text-lg">探索更多</Button>
      </div>
    </div>
  )
}