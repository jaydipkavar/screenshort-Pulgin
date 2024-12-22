const customCSS = `
        ::-webkit-scrollbar {
            width: 10px;
        }
        ::-webkit-scrollbar-track {
            background: #27272a;
        }
        ::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 0.375rem;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
    `;
const styleTag = document.createElement("style");
styleTag.textContent = customCSS;
document.head.append(styleTag);

let labels = [];

function unmarkPage() {
  for (const label of labels) {
    if (label.parentNode) {
      document.body.removeChild(label);
    }
  }
  labels = [];
}

function markPage() {
  unmarkPage();

  const elementsToMark = [
    "input",
    "textarea",
    "select",
    "button",
    "a",
    "iframe",
    "video",
  ];

  let items = Array.from(document.querySelectorAll(elementsToMark.join(", ")))
    .map((element) => {
      const textualContent = element.textContent.trim().replace(/\s{2,}/g, " ");
      const elementType = element.tagName.toLowerCase();
      const ariaLabel = element.getAttribute("aria-label") || "";

      const rects = [...element.getClientRects()].map((bb) => {
        const rect = {
          left: bb.left + window.scrollX,
          top: bb.top + window.scrollY,
          right: bb.right + window.scrollX,
          bottom: bb.bottom + window.scrollY,
        };
        return {
          ...rect,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
        };
      });

      const area = rects.reduce((acc, r) => acc + r.width * r.height, 0);

      return {
        element,
        area,
        rects,
        text: textualContent,
        type: elementType,
        ariaLabel,
      };
    })
    .filter((item) => item.area >= 20);

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  items.forEach((item, index) => {
    item.rects.forEach((bbox) => {
      const newElement = document.createElement("div");
      const borderColor = getRandomColor();
      newElement.style.position = "absolute";
      newElement.style.left = bbox.left + "px";
      newElement.style.top = bbox.top + "px";
      newElement.style.width = bbox.width + "px";
      newElement.style.height = bbox.height + "px";
      newElement.style.outline = `2px dashed ${borderColor}`;
      newElement.style.pointerEvents = "none";
      newElement.style.boxSizing = "border-box";
      newElement.style.zIndex = 2147483647;

      const label = document.createElement("span");
      label.textContent = index;
      label.style.position = "absolute";
      label.style.top = "-19px";
      label.style.left = "0px";
      label.style.background = borderColor;
      label.style.color = "white";
      label.style.padding = "2px 4px";
      label.style.fontSize = "12px";
      label.style.borderRadius = "2px";
      newElement.appendChild(label);

      document.body.appendChild(newElement);
      labels.push(newElement);
    });
  });

  return items; // Return items to make it accessible outside
}

function loadHtml2CanvasIfNeeded() {
  return new Promise((resolve, reject) => {
    if (typeof window.html2canvas !== "undefined") {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => {
      if (typeof window.html2canvas !== "undefined") {
        resolve();
      } else {
        reject(new Error("html2canvas failed to load."));
      }
    };
    script.onerror = () =>
      reject(new Error("Error loading html2canvas script."));
    document.head.appendChild(script);
  });
}

function getPageData() {
  return new Promise(async function () {
    try {
      await loadHtml2CanvasIfNeeded();

      document.documentElement.style.overflow = "visible";
      document.body.style.overflow = "visible";

      // Mark the page and get the items array
      const items = markPage();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const pageHeight = document.documentElement.scrollHeight;
      window.scrollTo(0, 0);

      html2canvas(document.documentElement, {
        scale: 1,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: pageHeight,
      }).then((canvas) => {
        unmarkPage();

        const dataURL = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = "screenshot.png";
        document.body.appendChild(link);

        // Trigger the download
        link.click();
        // Collect coordinates from items
        const coordinates = items.flatMap((item) =>
          item.rects.map(({ left, top, width, height }) => ({
            x: left + width / 2,
            y: top + height / 2,
            type: item.type,
            text: item.text,
            ariaLabel: item.ariaLabel,
          }))
        );
        console.log(coordinates);
        return {
          coordinates: JSON.stringify(coordinates),
          img: dataURL,
        };
      });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });
}
console.log(typeof getPageData === "function");
