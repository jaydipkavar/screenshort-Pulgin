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

  const vw = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0
  );
  const vh = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );

  let items = Array.from(document.querySelectorAll("*"))
    .map((element) => {
      const textualContent = element.textContent.trim().replace(/\s{2,}/g, " ");
      const elementType = element.tagName.toLowerCase();
      const ariaLabel = element.getAttribute("aria-label") || "";

      // Get bounding rects in global coordinates
      const rects = [...element.getClientRects()]
        .filter((bb) => {
          const center_x = bb.left + bb.width / 2;
          const center_y = bb.top + bb.height / 2;
          const elAtCenter = document.elementFromPoint(center_x, center_y);
          return elAtCenter === element || element.contains(elAtCenter);
        })
        .map((bb) => {
          // Add window.scrollX/scrollY to get absolute page coordinates
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
      const include =
        [
          "input",
          "textarea",
          "select",
          "button",
          "a",
          "iframe",
          "video",
        ].includes(elementType) ||
        element.onclick != null ||
        window.getComputedStyle(element).cursor === "pointer";

      return {
        element,
        include,
        area,
        rects,
        text: textualContent,
        type: elementType,
        ariaLabel,
      };
    })
    .filter((item) => item.include && item.area >= 20);

  // Only keep the outermost clickable elements
  items = items.filter(
    (x) => !items.some((y) => x.element.contains(y.element) && x !== y)
  );

  function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Draw bounding boxes using absolute positioning
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

  return items.flatMap((item) =>
    item.rects.map(({ left, top, width, height }) => ({
      x: left + width / 2,
      y: top + height / 2,
      type: item.type,
      text: item.text,
      ariaLabel: item.ariaLabel,
    }))
  );
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
    script.integrity =
      "sha512-b4t5B2p8gqVyXMQiqwzZEZ9NSC06/Hz7lNip5N1f5vJoXqtSE2/T/bk0VfP4FizLxCJ4vRGri4jB7NJFh6Ss0A==";
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
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

(async function () {
  try {
    await loadHtml2CanvasIfNeeded();

    // Force full size so html2canvas can capture everything
    document.documentElement.style.overflow = "visible";
    document.body.style.overflow = "visible";

    // Mark the page
    markPage();
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Calculate full page dimensions
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    );
    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );

    // Capture with html2canvas
    html2canvas(document.documentElement, {
      scale: 1,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: scrollWidth,
      windowHeight: scrollHeight,
    }).then((canvas) => {
      const dataURL = canvas.toDataURL("image/png");
      const newTab = window.open();
      newTab.document.write('<img src="' + dataURL + '"/>');
    });
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
