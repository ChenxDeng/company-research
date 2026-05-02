// components/DownloadButton.tsx

"use client";

export function DownloadButton() {
  const handleDownload = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("report-content");
    if (!element) return;

    const companyName = document.querySelector(".company-name")?.textContent?.trim() || "公司";

    const opt = {
      margin: [4, 4, 4, 4] as [number, number, number, number],
      filename: `${companyName}简历.pdf`,
      image: { type: "jpeg" as const, quality: 0.85 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#faf9f7",
        logging: false,
        // Use onclone to fix elements in the cloned document before rendering
        onclone: (doc: Document) => {
          const cloned = doc.getElementById("report-content");
          if (!cloned) return;

          // Force all elements fully visible, disable animations
          const allElements = cloned.querySelectorAll("*") as NodeListOf<HTMLElement>;
          allElements.forEach((el) => {
            el.style.opacity = "1";
            el.style.animation = "none";
            el.style.transform = "none";
            el.style.transition = "none";
          });

          // Hide the download button in the PDF
          const btn = cloned.querySelector(".download-section");
          if (btn) (btn as HTMLElement).style.display = "none";
        },
      },
      jsPDF: {
        unit: "mm" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
      pagebreak: { mode: ["avoid-all"] },
    };

    await html2pdf().set(opt).from(element).save();
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
