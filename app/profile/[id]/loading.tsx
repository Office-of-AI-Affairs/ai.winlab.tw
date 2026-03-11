export default function Loading() {
  return (
    <main className="flex items-center justify-center">
      <div className="max-w-6xl w-full">
        <div className="grid p-4 gap-4 animate-pulse">

          {/* Top bar — matches Block variant="ghost" p-6 */}
          <div className="flex items-center justify-between p-6">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>

          <div className="w-full grid lg:grid-cols-3 gap-4">

            {/* LEFT: profile block */}
            <div className="col-span-1">
              <div className="rounded-[2rem] border border-border p-6 flex flex-col gap-4">
                <div className="w-20 h-20 rounded-full bg-muted" />
                <div className="flex flex-col gap-2">
                  <div className="h-6 w-32 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="h-3 w-40 rounded bg-muted" />
                  <div className="h-3 w-36 rounded bg-muted" />
                </div>
              </div>
            </div>

            {/* RIGHT: results */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-[2rem] border border-border p-6 grid lg:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="h-6 w-2/3 rounded-lg bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-4/5 rounded bg-muted" />
                  </div>
                  <div className="aspect-video rounded-[2rem] bg-muted" />
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
