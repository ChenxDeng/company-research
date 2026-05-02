import { conductResearch } from "@/lib/deepseek";
import type { ResearchEvent } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { company, position } = body;

  if (!company || typeof company !== "string" || company.trim().length === 0) {
    return Response.json(
      { error: "公司名称不能为空" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ResearchEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        send({ type: "status", message: "开始调研..." });

        const report = await conductResearch(
          company.trim(),
          position?.trim() || undefined,
          (message) => send({ type: "status", message }),
        );

        send({ type: "report", data: report });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "调研过程中出现错误",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
