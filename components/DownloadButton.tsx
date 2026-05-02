// components/DownloadButton.tsx

"use client";

function inlineComputedStyles(source: HTMLElement, target: HTMLElement) {
  const sourceChildren = source.querySelectorAll("*");
  const targetChildren = target.querySelectorAll("*");

  // Copy styles for the root element
  copyStyles(source, target);

  // Copy styles for all children
  for (let i = 0; i < sourceChildren.length; i++) {
    copyStyles(sourceChildren[i] as HTMLElement, targetChildren[i] as HTMLElement);
  }
}

function copyStyles(source: HTMLElement, target: HTMLElement) {
  const computed = getComputedStyle(source);
  const properties = [
    "color", "background-color", "background", "border", "border-color",
    "border-top", "border-right", "border-bottom", "border-left",
    "border-radius", "box-shadow", "text-shadow", "opacity",
    "font-size", "font-weight", "font-family", "line-height",
    "padding", "margin", "display", "flex-direction", "gap",
    "align-items", "justify-content", "grid-template-columns",
    "text-align", "letter-spacing", "text-transform",
    "width", "max-width", "min-height", "overflow",
  ];

  for (const prop of properties) {
    try {
      target.style.setProperty(prop, computed.getPropertyValue(prop));
    } catch {
      // Some properties can't be set
    }
  }
}

export function DownloadButton() {
  const handleDownload = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("report-content");
    if (!element) return;

    const companyName = document.querySelector(".company-name")?.textContent?.trim() || "公司";

    // Clone element and inline all computed styles
    const clone = element.cloneNode(true) as HTMLElement;
    inlineComputedStyles(element, clone);

    // Set explicit background and dimensions
    clone.style.width = element.offsetWidth + "px";
    clone.style.background = "#faf9f7";
    clone.style.padding = "20px";
    clone.style.boxSizing = "border-box";

    // Add to DOM off-screen for rendering
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    document.body.appendChild(clone);

    const opt = {
      margin: [4, 4, 4, 4] as [number, number, number, number],
      filename: `${companyName}简历.pdf`,
      image: { type: "jpeg" as const, quality: 0.85 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#faf9f7",
        logging: false,
      },
      jsPDF: {
        unit: "mm" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
      pagebreak: { mode: ["avoid-all"] },
    };

    try {
      await html2pdf().set(opt).from(clone).save();
    } finally {
      document.body.removeChild(clone);
    }
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
