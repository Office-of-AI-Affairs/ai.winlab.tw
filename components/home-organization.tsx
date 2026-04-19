import { getOrganizationMembers } from "@/app/introduction/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export async function HomeOrganization() {
  const all = await getOrganizationMembers();
  const members = all.slice(0, 6);
  if (members.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/40 py-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">組織人員</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <Link key={member.id} href="/introduction">
              <Card className="py-0 h-full flex flex-col overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
                <div className="relative w-full aspect-square shrink-0 overflow-hidden">
                  <Image
                    src={resolveImageSrc(member.image)}
                    alt={member.name}
                    fill
                    className="object-cover"
                    unoptimized={isExternalImage(member.image)}
                  />
                </div>
                <CardHeader className="shrink-0 pb-4">
                  <CardTitle className="text-lg font-bold line-clamp-2">
                    {member.name}
                  </CardTitle>
                  {member.summary && (
                    <CardDescription className="line-clamp-3">
                      {member.summary}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
        <div className="flex justify-center">
          <Button asChild variant="secondary" className="px-12 text-lg">
            <Link href="/introduction">
              探索更多
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
