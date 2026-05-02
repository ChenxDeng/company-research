// components/DownloadButton.tsx

"use client";

function forceVisible(element: HTMLElement) {
  // Force the element and all children to be fully visible
  element.style.opacity = "1";
  element.style.animation = "none";
  element.style.transform = "none";
  element.style.transition = "none";

  const children = element.querySelectorAll("*") as NodeListOf<HTMLElement>;
  children.forEach((child) => {
    child.style.opacity = "1";
    child.style.animation = "none";
    child.style.transform = "none";
    child.style.transition = "none";
  });
}

function inlineColors(source: HTMLElement, target: HTMLElement) {
  const colorProps = [
    "color", "background-color", "background",
    "border-color", "border-top-color", "border-right-color",
    "border-bottom-color", "border-left-color",
    "border-radius",
    "font-size", "font-weight", "line-height",
    "padding", "text-align", "letter-spacing",
  ];

  const copyToElement = (src: HTMLElement, tgt: HTMLElement) => {
    const computed = getComputedStyle(src);
    for (const prop of colorProps) {
      try {
        tgt.style.setProperty(prop, computed.getPropertyValue(prop));
      } catch {
        // skip
      }
    }
  };

  copyToElement(source, target);
  const srcChildren = source.querySelectorAll("*") as NodeListOf<HTMLElement>;
  const tgtChildren = target.querySelectorAll("*") as NodeListOf<HTMLElement>;
  srcChildren.forEach((src, i) => {
    if (tgtChildren[i]) copyToElement(src, tgtChildren[i]);
  });
}

export function DownloadButton() {
  const handleDownload = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("report-content");
    if (!element) return;

    const companyName = document.querySelector(".company-name")?.textContent?.trim() || "公司";

    // Deep clone
    const clone = element.cloneNode(true) as HTMLElement;

    // Inline color styles to resolve CSS variables
    inlineColors(element, clone);

    // Force all elements fully visible (remove animation opacity)
    forceVisible(clone);

    // Set explicit styles for the container
    clone.style.width = element.offsetWidth + "px";
    clone.style.background = "#faf9f7";
    clone.style.padding = "20px";
    clone.style.boxSizing = "border-box";
    clone.style.opacity = "1";

    // Hide the download button inside the clone
    const btnInClone = clone.querySelector(".download-section");
    if (btnInClone) (btnInClone as HTMLElement).style.display = "none";

    // Add to DOM off-screen
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
        removeContainer: true,
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
