// src/CirclePacker.ts
var CirclePacker = class {
  defaultOptions = {
    spacing: 1,
    numCircles: 1e3,
    minRadius: 1,
    maxRadius: 10,
    higherAccuracy: false,
    colors: "auto",
    minAlpha: 1
  };
  defaultExportOptions = {
    scale: window.devicePixelRatio,
    quality: 1,
    format: "image/png"
  };
  options;
  spareCircles = [];
  placedCircles = [];
  dims = { width: 0, height: 0 };
  constructor(options = {}) {
    this.options = { ...this.defaultOptions, ...options };
    for (let i = 0; i < this.options.numCircles; i++) {
      this.spareCircles.push({
        radius: this.options.minRadius + Math.random() * Math.random() * (this.options.maxRadius - this.options.minRadius)
      });
    }
    this.spareCircles.sort((a, b) => a.radius - b.radius);
  }
  isFilled(imageData, x, y) {
    x = Math.round(x);
    y = Math.round(y);
    return imageData.data[(this.dims.width * y + x) * 4 + 3] > this.options.minAlpha;
  }
  isCircleInside(imageData, x, y, r) {
    if (!this.isFilled(imageData, x, y - r)) return false;
    if (!this.isFilled(imageData, x, y + r)) return false;
    if (!this.isFilled(imageData, x + r, y)) return false;
    if (!this.isFilled(imageData, x - r, y)) return false;
    if (this.options.higherAccuracy) {
      const o = Math.cos(Math.PI / 4);
      if (!this.isFilled(imageData, x + o, y + o)) return false;
      if (!this.isFilled(imageData, x - o, y + o)) return false;
      if (!this.isFilled(imageData, x - o, y - o)) return false;
      if (!this.isFilled(imageData, x + o, y - o)) return false;
    }
    return true;
  }
  touchesPlacedCircle(x, y, r) {
    return this.placedCircles.some((circle) => {
      return this.dist(x, y, circle.x, circle.y) < circle.radius + r + this.options.spacing;
    });
  }
  dist(x1, y1, x2, y2) {
    const a = x1 - x2;
    const b = y1 - y2;
    return Math.sqrt(a * a + b * b);
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
  render(imageData, imageWidth) {
    let i = this.spareCircles.length;
    this.dims = { width: imageWidth, height: imageData.data.length / imageWidth / 4 };
    while (i > 0) {
      i--;
      const circle = this.spareCircles[i];
      let safety = 1e3;
      while (!circle.x && safety-- > 0) {
        const x = Math.random() * this.dims.width;
        const y = Math.random() * this.dims.height;
        if (this.isCircleInside(imageData, x, y, circle.radius)) {
          if (!this.touchesPlacedCircle(x, y, circle.radius)) {
            const color = this.getCircleColor(imageData, x, y);
            if (color) {
              circle.x = x;
              circle.y = y;
              circle.color = color;
              this.placedCircles.push(circle);
            }
          }
        }
      }
    }
    return this.placedCircles;
  }
  asSVGString() {
    const svg = `<svg width="${this.dims.width}" height="${this.dims.height}" viewBox="0 0 ${this.dims.width} ${this.dims.height}" xmlns="http://www.w3.org/2000/svg">` + this.placedCircles.map((circle) => {
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
function fromImageData(imageData, imageWidth, options = {}) {
  const cf = new CirclePacker(options);
  cf.render(imageData, imageWidth);
  return cf;
}
function fromContext2D(ctx, options = {}) {
  return fromImageData(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height), ctx.canvas.width, options);
}
function fromCanvas(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  return fromContext2D(ctx, options);
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
function ishihara_default(options = {}) {
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
    const packedCanvas = fromCanvas(mergedContext.canvas, mergedOptions.circlePackerOptions).asCanvas({ scale: 1 });
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
  return fromCanvas(mergedContext.canvas, mergedOptions.circlePackerOptions);
}

// src/index.ts
var src_default = ishihara_default;

export { src_default as default };
