import { Phone } from "lucide-react";

export function HomeContacts() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-6">
      <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="flex lg:flex-row flex-col gap-6 w-full">
          <div className="flex flex-col gap-6 justify-center items-center w-full">
            <h2 className="text-2xl font-bold">聯絡我們</h2>
            <p className="text-2xl">想知道更多的資訊或是有疑問想要問我們</p>
            <p className="text-2xl">歡迎透過以下聯絡人跟我們聯繫</p>
          </div>
          <div className="flex flex-col gap-6 justify-center items-center w-full">
            <Phone className="w-8 h-8" />
            <p className="text-lg">總機：03-4227151</p>
            <p className="text-lg">教學發展中心 莊先生(分機：57189)</p>
            <p className="text-lg">email：tony57189@ncu.edu.tw</p>
          </div>
        </div>
      </div>
    </div>
  )
}