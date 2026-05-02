// app/page.tsx

"use client";

import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { ReportView } from "@/components/ReportView";
import { LoadingState } from "@/components/LoadingState";
import { DownloadButton } from "@/components/DownloadButton";
import type { ResearchReport, ResearchEvent } from "@/lib/types";

export default function Home() {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async (company: string, position: string) => {
    setIsLoading(true);
    setReport(null);
    setError("");
    setStatus("正在连接...");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, position: position || undefined }),
      });

      if (!response.ok) {
        throw new Error("请求失败");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event: ResearchEvent = JSON.parse(line.slice(6));

            switch (event.type) {
              case "status":
                setStatus(event.message);
                break;
              case "report":
                setReport(event.data);
                break;
              case "error":
                setError(event.message);
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="site-header">
        <div className="logo">公司调研助手</div>
        <div className="tagline">为求职者打造的透明化企业信息平台</div>
      </header>

      <SearchForm onSearch={handleSearch} isLoading={isLoading} />

      {isLoading && <LoadingState status={status} />}

      {error && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--warning)",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {report && (
        <>
          <ReportView report={report} />
          <DownloadButton />
        </>
      )}

      <footer className="site-footer">
        数据来源均为公开信息，仅供参考 · 请以实际情况为准
      </footer>
    </div>
  );
}
