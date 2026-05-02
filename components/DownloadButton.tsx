// components/DownloadButton.tsx

"use client";

import type { ResearchReport } from "@/lib/types";

interface DownloadButtonProps {
  report: ResearchReport;
}

export function DownloadButton({ report }: DownloadButtonProps) {
  const handleDownload = async () => {
    const { generateReportPdf } = await import("@/lib/generate-pdf");
    await generateReportPdf(report);
  };

  return (
    <div className="download-section">
      <button className="download-btn" onClick={handleDownload}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        下载 PDF 报告
      </button>
    </div>
  );
}
