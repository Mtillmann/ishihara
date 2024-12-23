// src/Core.ts
var Core_default = {
  pack(imageData, imageWidth, spareCircles, options) {
    let i = spareCircles.length;
    const placedCircles = [];
    const dims = { width: imageWidth, height: imageData.data.length / imageWidth / 4 };
    while (i > 0) {
      i--;
      const circle = spareCircles[i];
      let safety = 1e3;
      while (!circle.x && safety-- > 0) {
        const x = Math.random() * dims.width;
        const y = Math.random() * dims.height;
        if (this.isCircleInside(imageData, dims.width, x, y, circle.radius, options.higherAccuracy, options.minAlpha)) {
          if (!this.touchesPlacedCircle(x, y, circle.radius, placedCircles, options.spacing)) {
            circle.x = x;
            circle.y = y;
            placedCircles.push(circle);
          }
        }
      }
    }
    return placedCircles;
  },
  isFilled(imageData, x, y, width, minAlpha) {
    x = Math.round(x);
    y = Math.round(y);
    return imageData.data[(width * y + x) * 4 + 3] > minAlpha;
  },
  isCircleInside(imageData, width, x, y, radius, higherAccuracy, minAlpha) {
    if (!this.isFilled(imageData, x, y - radius, width, minAlpha)) return false;
    if (!this.isFilled(imageData, x, y + radius, width, minAlpha)) return false;
    if (!this.isFilled(imageData, x + radius, y, width, minAlpha)) return false;
    if (!this.isFilled(imageData, x - radius, y, width, minAlpha)) return false;
    if (higherAccuracy) {
      const o = Math.cos(Math.PI / 4);
      if (!this.isFilled(imageData, x + o, y + o, width, minAlpha)) return false;
      if (!this.isFilled(imageData, x - o, y + o, width, minAlpha)) return false;
      if (!this.isFilled(imageData, x - o, y - o, width, minAlpha)) return false;
      if (!this.isFilled(imageData, x + o, y - o, width, minAlpha)) return false;
    }
    return true;
  },
  touchesPlacedCircle(x, y, r, placedCircles, spacing) {
    return placedCircles.some((circle) => {
      return this.dist(x, y, circle.x, circle.y) < circle.radius + r + spacing;
    });
  },
  dist(x1, y1, x2, y2) {
    const a = x1 - x2;
    const b = y1 - y2;
    return Math.sqrt(a * a + b * b);
  }
};

// src/CirclePacker.ts
var CirclePacker = class {
  defaultOptions = {
    spacing: 1,
    numCircles: 1e3,
    minRadius: 1,
    maxRadius: 10,
    higherAccuracy: false,
    colors: "auto",
    minAlpha: 1,
    background: "transparent",
    useMainThread: false,
    reuseWorker: true
  };
  defaultExportOptions = {
    scale: globalThis.devicePixelRatio || 1,
    quality: 1,
    format: "image/png"
  };
  options;
  spareCircles = [];
  placedCircles = [];
  dims = { width: 0, height: 0 };
  worker = null;
  constructor(options = {}) {
    this.options = { ...this.defaultOptions, ...options };
    if (["transparent", null, "", false, void 0].includes(this.options.background)) {
      this.options.background = false;
    }
    for (let i = 0; i < this.options.numCircles; i++) {
      this.spareCircles.push({
        radius: this.options.minRadius + Math.random() * Math.random() * (this.options.maxRadius - this.options.minRadius)
      });
    }
    this.spareCircles.sort((a, b) => a.radius - b.radius);
  }
  getCircleColor(imageData, x, y) {
    if (this.options.colors === "auto") {
      x = Math.round(x);
      y = Math.round(y);
      const i = (this.dims.width * y + x) * 4;
      if (imageData.data[i + 3] / 255 < this.options.minAlpha) {
        return false;
      }
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      return `rgb(${r},${g},${b})`;
    }
    return this.options.colors[Math.floor(Math.random() * this.options.colors.length)];
  }
  async pack(imageData, imageWidth) {
    let circles = [];
    if (typeof Worker === "undefined" || this.options.useMainThread) {
      circles = Core_default.pack(imageData, imageWidth, this.spareCircles, this.options);
    } else {
      if (!this.worker) {
        this.worker = new Worker("data:text/javascript;base64,dmFyIENvcmVfZGVmYXVsdD17cGFjayhpLHQsZSxzKXtsZXQgcj1lLmxlbmd0aDtjb25zdCBhPVtdLGQ9e3dpZHRoOnQsaGVpZ2h0OmkuZGF0YS5sZW5ndGgvdC80fTtmb3IoO3I+MDspe3ItLTtjb25zdCB0PWVbcl07bGV0IGg9MWUzO2Zvcig7IXQueCYmaC0tID4wOyl7Y29uc3QgZT1NYXRoLnJhbmRvbSgpKmQud2lkdGgscj1NYXRoLnJhbmRvbSgpKmQuaGVpZ2h0O3RoaXMuaXNDaXJjbGVJbnNpZGUoaSxkLndpZHRoLGUscix0LnJhZGl1cyxzLmhpZ2hlckFjY3VyYWN5LHMubWluQWxwaGEpJiYodGhpcy50b3VjaGVzUGxhY2VkQ2lyY2xlKGUscix0LnJhZGl1cyxhLHMuc3BhY2luZyl8fCh0Lng9ZSx0Lnk9cixhLnB1c2godCkpKX19cmV0dXJuIGF9LGlzRmlsbGVkOihpLHQsZSxzLHIpPT4odD1NYXRoLnJvdW5kKHQpLGU9TWF0aC5yb3VuZChlKSxpLmRhdGFbNCoocyplK3QpKzNdPnIpLGlzQ2lyY2xlSW5zaWRlKGksdCxlLHMscixhLGQpe2lmKCF0aGlzLmlzRmlsbGVkKGksZSxzLXIsdCxkKSlyZXR1cm4hMTtpZighdGhpcy5pc0ZpbGxlZChpLGUscytyLHQsZCkpcmV0dXJuITE7aWYoIXRoaXMuaXNGaWxsZWQoaSxlK3Iscyx0LGQpKXJldHVybiExO2lmKCF0aGlzLmlzRmlsbGVkKGksZS1yLHMsdCxkKSlyZXR1cm4hMTtpZihhKXtjb25zdCByPU1hdGguY29zKE1hdGguUEkvNCk7aWYoIXRoaXMuaXNGaWxsZWQoaSxlK3IscytyLHQsZCkpcmV0dXJuITE7aWYoIXRoaXMuaXNGaWxsZWQoaSxlLXIscytyLHQsZCkpcmV0dXJuITE7aWYoIXRoaXMuaXNGaWxsZWQoaSxlLXIscy1yLHQsZCkpcmV0dXJuITE7aWYoIXRoaXMuaXNGaWxsZWQoaSxlK3Iscy1yLHQsZCkpcmV0dXJuITF9cmV0dXJuITB9LHRvdWNoZXNQbGFjZWRDaXJjbGUoaSx0LGUscyxyKXtyZXR1cm4gcy5zb21lKChzPT50aGlzLmRpc3QoaSx0LHMueCxzLnkpPHMucmFkaXVzK2UrcikpfSxkaXN0KGksdCxlLHMpe2NvbnN0IHI9aS1lLGE9dC1zO3JldHVybiBNYXRoLnNxcnQocipyK2EqYSl9fTtzZWxmLm9ubWVzc2FnZT1pPT57cG9zdE1lc3NhZ2UoQ29yZV9kZWZhdWx0LnBhY2soaS5kYXRhLmltYWdlRGF0YSxpLmRhdGEuaW1hZ2VXaWR0aCxpLmRhdGEuc3BhcmVDaXJjbGVzLGkuZGF0YS5vcHRpb25zKSl9Ow==");
      }
      circles = await new Promise((resolve) => {
        this.worker.onmessage = (e) => resolve(e.data);
        this.worker.postMessage({
          imageData,
          imageWidth,
          spareCircles: this.spareCircles,
          options: this.options
        });
      });
      if (!this.options.reuseWorker) {
        this.worker.terminate();
      }
    }
    this.dims = { width: imageWidth, height: imageData.data.length / imageWidth / 4 };
    this.placedCircles = circles.reduce((acc, circle) => {
      const color = this.getCircleColor(imageData, circle.x, circle.y);
      if (color) {
        circle.color = color;
        acc.push(circle);
      }
      return acc;
    }, []);
    return this.placedCircles;
  }
  asSVGString() {
    const svg = `<svg width="${this.dims.width}" height="${this.dims.height}" viewBox="0 0 ${this.dims.width} ${this.dims.height}" xmlns="http://www.w3.org/2000/svg">` + (this.options.background ? `<rect x="0" y="0" width="${this.dims.width}" height="${this.dims.height}" fill="${this.options.background}" />` : "") + this.placedCircles.map((circle) => {
      const { x, y, radius, color } = circle;
      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" />`;
    }).join("") + "</svg>";
    return svg;
  }
  asSVG() {
    const svgString = this.asSVGString();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    return doc.documentElement;
  }
  asCanvas(options = {}) {
    options = { ...this.defaultExportOptions, ...options };
    const scale = options.scale;
    const canvas = document.createElement("canvas");
    canvas.width = this.dims.width * scale;
    canvas.height = this.dims.height * scale;
    const ctx = canvas.getContext("2d");
    if (this.options.background) {
      ctx.fillStyle = this.options.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    for (const circle of this.placedCircles) {
      const { x, y, radius, color } = circle;
      ctx.fillStyle = String(color);
      ctx.beginPath();
      ctx.arc(Number(x * scale), Number(y * scale), radius * scale, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
    }
    return canvas;
  }
  asImageData(options = {}) {
    options = { ...this.defaultExportOptions, ...options };
    const canvas = this.asCanvas(options);
    return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  }
  async asBlob(options = {}) {
    options = { ...this.defaultExportOptions, ...options };
    const canvas = this.asCanvas(options);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob2) => {
          if (blob2) {
            resolve(blob2);
          } else {
            reject(new Error("Blob creation failed"));
          }
        },
        options.format,
        options.quality
      );
    });
    return blob;
  }
  async asBlobURL(options = {}) {
    return URL.createObjectURL(await this.asBlob(options));
  }
  asDataURL(options = {}) {
    options = { ...this.defaultExportOptions, ...options };
    return this.asCanvas().toDataURL(options.format, options.quality);
  }
  asArray() {
    return this.placedCircles;
  }
};
async function fromImageData(imageData, imageWidth, options = {}) {
  const cf = new CirclePacker(options);
  await cf.pack(imageData, imageWidth);
  return cf;
}
async function fromContext2D(ctx, options = {}) {
  return await fromImageData(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height), ctx.canvas.width, options);
}
async function fromCanvas(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  return await fromContext2D(ctx, options);
}

// src/ishihara.ts
function applySpacing(base, value) {
  if (typeof value === "number") {
    return value + base;
  }
  return base + base * (parseFloat(value) / 100) * 2;
}
function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
function makeContext(width, height) {
  return makeCanvas(width, height).getContext("2d");
}
function makeFilledCanvas(width, height, colors, swatchSize = 4) {
  const context = makeContext(width, height);
  context.beginPath();
  for (let y = 0; y < height; y += swatchSize) {
    for (let x = 0; x < width; x += swatchSize) {
      context.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      context.fillRect(x, y, swatchSize, swatchSize);
    }
  }
  context.closePath();
  return context.canvas;
}
function makeTextCanvas(width, height, x, y, text, font, color = "black") {
  const context = makeContext(width, height);
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText(text, x, y);
  return context.canvas;
}
function drawRuler(context, x, y0, y1, text) {
  const endWidth = 20;
  const strokes = [
    ["#ffffff", 10],
    ["#000000", 3]
  ];
  context.lineCap = "round";
  for (const pair of strokes) {
    const [color, width] = pair;
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x - endWidth * 0.5, y0);
    context.lineTo(x + endWidth * 0.5, y0);
    context.moveTo(x, y0);
    context.lineTo(x, y1);
    context.moveTo(x - endWidth * 0.5, y1);
    context.lineTo(x + endWidth * 0.5, y1);
    context.stroke();
    context.closePath();
  }
  context.font = "12px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#000000";
  context.strokeStyle = "#ffffff";
  context.strokeText(text, x, (y0 + y1) * 0.5);
  context.fillText(text, x, (y0 + y1) * 0.5);
}
function makePositionDebugCanvas(options, width, height) {
  const context = makeContext(width, height);
  context.lineWidth = 2;
  context.beginPath();
  context.arc(width * 0.5, height * 0.5, options.innerRadius, 0, Math.PI * 2);
  context.stroke();
  context.closePath();
  context.beginPath();
  context.arc(width * 0.5, height * 0.5, options.backgroundRadius, 0, Math.PI * 2);
  context.stroke();
  context.closePath();
  const margin = (options.edgeLength - options.backgroundRadius * 2) * 0.5;
  const marginText = `margin: ${margin.toFixed(2)}px (${options.mergedOptions.margin})`;
  drawRuler(context, width * 0.5, 0, margin, marginText);
  const padding = options.backgroundRadius - options.innerRadius;
  const paddingText = `padding: ${padding.toFixed(2)}px (${options.mergedOptions.padding})`;
  drawRuler(context, width * 0.5, margin + options.innerRadius * 2 + padding, margin + options.innerRadius * 2 + padding * 2, paddingText);
  const radius = options.innerRadius;
  const radiusText = `radius: ${radius.toFixed(2)}px (${options.mergedOptions.radius})`;
  drawRuler(context, width * 0.5, margin + padding, margin + padding + radius, radiusText);
  return context.canvas;
}
function makeTextCorrectionCanvas(width, height, x, y, text, font, measurements) {
  const textCanvas = makeTextCanvas(width, height, x, y, text, font, "rgba(0, 0, 0, 0.5)");
  const context = textCanvas.getContext("2d");
  context.beginPath();
  context.setLineDash([5, 5]);
  context.lineWidth = 2;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeText(text, x, y - measurements.yOffset);
  context.closePath();
  context.setLineDash([]);
  const rulerY = y - measurements.yOffset * 2 - measurements.textHeight * 0.5;
  drawRuler(context, width * 0.5 + measurements.textWidth * 0.5, rulerY, rulerY + measurements.yOffset, "offset: " + measurements.yOffset.toFixed(2) + "px");
  return textCanvas;
}
function maskCanvas(source, mask) {
  const context = makeContext(source.width, source.height);
  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = "source-over";
  return context.canvas;
}
function measureText(text, font) {
  const w = 2048;
  const h = 2048;
  const context = makeContext(w, h);
  const y = h / 2;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const textTop = y - metrics.actualBoundingBoxAscent;
  const yOffset = y - (textTop + textHeight * 0.5);
  return {
    textWidth,
    textHeight,
    yOffset,
    edgeLength: Math.max(textWidth, textHeight)
  };
}
async function ishihara_default(options = {}) {
  const circlePackerDefaultOptions = {};
  const defaultOptions = {
    textColors: [
      "#ffffff"
    ],
    backgroundColors: [
      "#000000"
    ],
    text: "8",
    font: "bold 256px sans-serif",
    padding: "20%",
    margin: "10%",
    circlePackerOptions: circlePackerDefaultOptions,
    radius: "auto",
    debug: false
  };
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    circlePackerOptions: {
      ...defaultOptions.circlePackerOptions,
      ...options.circlePackerOptions
    }
  };
  mergedOptions.text = mergedOptions.text.slice(0, 2);
  const measurement = measureText(mergedOptions.text, mergedOptions.font);
  const innerRadius = mergedOptions.radius === "auto" ? measurement.edgeLength / 2 : mergedOptions.radius;
  const backgroundRadius = applySpacing(innerRadius, mergedOptions.padding);
  const edgeLength = applySpacing(backgroundRadius * 2, mergedOptions.margin);
  const textX = edgeLength * 0.5;
  const textY = edgeLength * 0.5 + measurement.yOffset;
  const text = makeTextCanvas(edgeLength, edgeLength, textX, textY, mergedOptions.text, mergedOptions.font);
  const backgroundMaskContext = makeContext(edgeLength, edgeLength);
  backgroundMaskContext.beginPath();
  backgroundMaskContext.arc(edgeLength * 0.5, edgeLength * 0.5, backgroundRadius, 0, Math.PI * 2);
  backgroundMaskContext.fill();
  backgroundMaskContext.closePath();
  const background = maskCanvas(makeFilledCanvas(edgeLength, edgeLength, mergedOptions.backgroundColors), backgroundMaskContext.canvas);
  const foreground = maskCanvas(makeFilledCanvas(edgeLength, edgeLength, mergedOptions.textColors), text);
  const mergedContext = makeContext(edgeLength, edgeLength);
  mergedContext.drawImage(background, 0, 0);
  mergedContext.drawImage(foreground, 0, 0);
  if (mergedOptions.debug) {
    const debugContext = makeContext(edgeLength * 4, edgeLength);
    debugContext.fillStyle = "rgb(255, 255, 255)";
    debugContext.fillRect(0, 0, edgeLength * 4, edgeLength);
    const textCorrectionCanvas = makeTextCorrectionCanvas(edgeLength, edgeLength, textX, textY, mergedOptions.text, mergedOptions.font, measurement);
    debugContext.drawImage(textCorrectionCanvas, 0, 0);
    debugContext.drawImage(mergedContext.canvas, edgeLength * 2, 0);
    const circlepackerInstance = await fromCanvas(mergedContext.canvas, mergedOptions.circlePackerOptions);
    const packedCanvas = circlepackerInstance.asCanvas({ scale: 1 });
    debugContext.drawImage(packedCanvas, edgeLength * 3, 0);
    const positionContext = makeContext(edgeLength, edgeLength);
    positionContext.drawImage(text, 0, 0);
    positionContext.fillStyle = "rgba(255, 255, 255, 0.75)";
    positionContext.beginPath();
    positionContext.rect(0, 0, edgeLength, edgeLength);
    positionContext.fill();
    positionContext.closePath();
    positionContext.drawImage(makePositionDebugCanvas({
      innerRadius,
      backgroundRadius,
      edgeLength,
      mergedOptions
    }, edgeLength, edgeLength), 0, 0);
    debugContext.drawImage(positionContext.canvas, edgeLength, 0);
    return new Proxy({}, {
      get() {
        return function() {
          return debugContext.canvas;
        };
      }
    });
  }
  return await fromCanvas(mergedContext.canvas, mergedOptions.circlePackerOptions);
}

// src/index.ts
var src_default = ishihara_default;

export { src_default as default };
