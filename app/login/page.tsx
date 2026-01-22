import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function LoginPage() {
  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col justify-center items-center gap-8 mt-8">
      <h1 className="text-3xl font-bold w-full text-center">登入</h1>
      <Card className="w-full max-w-lg p-6 py-10">
        <CardContent>
          <form>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-base shrink-0 w-12" htmlFor="account">帳號</Label>
                <Input
                  id="account"
                  type="text"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-base shrink-0 w-12" htmlFor="password">密碼</Label>
                <Input id="password" type="password" required />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full text-base">
            登入
          </Button>
          <Button variant="ghost" className="w-full text-base">
            忘記密碼？
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
