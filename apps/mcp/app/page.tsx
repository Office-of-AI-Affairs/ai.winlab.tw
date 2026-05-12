export default function Home() {
  return (
    <main className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 md:py-16">
      <section className="w-full max-w-md flex flex-col gap-6 text-center">
        <div>
          <h1 className="text-3xl font-bold">mcp.ai.winlab.tw</h1>
          <p className="text-muted-foreground mt-2">
          這裡提供 AI WinLab 的 MCP tool endpoint 與 OAuth 授權流程。MCP client 請使用
            <code className="mx-1 rounded bg-muted px-2 py-1 font-mono text-[13px] text-foreground">/mcp</code>
          進行連線。
          </p>
        </div>
      </section>
    </main>
  );
}
