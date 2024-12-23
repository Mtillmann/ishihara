import { Options } from './types/Options'
import { CirclePacker, fromCanvas } from '@mtillmann/circlepacker'
import type { Options as circlePackerOptions } from '@mtillmann/circlepacker'

function applySpacing (base: number, value: number | string) {
  if (typeof value === 'number') {
    return value + base
  }
  return base + (base * (parseFloat(value) / 100) * 2)
}

function makeCanvas (width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function makeContext (width: number, height: number): CanvasRenderingContext2D {
  return makeCanvas(width, height).getContext('2d')!
}

function makeFilledCanvas (width: number, height: number, colors: string[], swatchSize:number = 4): HTMLCanvasElement {
  const context = makeContext(width, height)
  context.beginPath()
  for (let y = 0; y < height; y += swatchSize) {
    for (let x = 0; x < width; x += swatchSize) {
      context.fillStyle = colors[Math.floor(Math.random() * colors.length)]
      context.fillRect(x, y, swatchSize, swatchSize)
    }
  }
  context.closePath()
  return context.canvas
}

function makeTextCanvas (width:number, height: number, x: number, y: number, text: string, font: string, color:string = 'black'): HTMLCanvasElement {
  const context = makeContext(width, height)
  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = color
  context.fillText(text, x, y)
  return context.canvas
}

function drawRuler (context:CanvasRenderingContext2D, x:number, y0:number, y1:number, text:string):void {
  const endWidth = 20
  const strokes = [
    ['#ffffff', 10],
    ['#000000', 3],
  ]
  context.lineCap = 'round'
  for (const pair of strokes) {
    const [color, width] = pair
    context.strokeStyle = color as string
    context.lineWidth = width as number
    context.beginPath()
    context.moveTo(x - endWidth * 0.5, y0)
    context.lineTo(x + endWidth * 0.5, y0)
    context.moveTo(x, y0)
    context.lineTo(x, y1)
    context.moveTo(x - endWidth * 0.5, y1)
    context.lineTo(x + endWidth * 0.5, y1)
    context.stroke()
    context.closePath()
  }

  context.font = '12px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#000000'
  context.strokeStyle = '#ffffff'

  context.strokeText(text, x, (y0 + y1) * 0.5)
  context.fillText(text, x, (y0 + y1) * 0.5)
}

function makePositionDebugCanvas (options: Record<string, any>, width: number, height: number): HTMLCanvasElement {
  const context = makeContext(width, height)
  context.lineWidth = 2
  context.beginPath()
  context.arc(width * 0.5, height * 0.5, options.innerRadius, 0, Math.PI * 2)
  context.stroke()
  context.closePath()

  context.beginPath()
  context.arc(width * 0.5, height * 0.5, options.backgroundRadius, 0, Math.PI * 2)
  context.stroke()
  context.closePath()

  const margin = (options.edgeLength - options.backgroundRadius * 2) * 0.5
  const marginText = `margin: ${margin.toFixed(2)}px (${options.mergedOptions.margin})`
  drawRuler(context, width * 0.5, 0, margin, marginText)

  const padding = (options.backgroundRadius - options.innerRadius)
  const paddingText = `padding: ${padding.toFixed(2)}px (${options.mergedOptions.padding})`
  drawRuler(context, width * 0.5, margin + options.innerRadius * 2 + padding, margin + options.innerRadius * 2 + padding * 2, paddingText)

  const radius = options.innerRadius
  const radiusText = `radius: ${radius.toFixed(2)}px (${options.mergedOptions.radius})`
  drawRuler(context, width * 0.5, margin + padding, margin + padding + radius, radiusText)

  return context.canvas
}

function makeTextCorrectionCanvas (width: number, height: number, x: number, y: number, text: string, font: string, measurements: Record<string, number>): HTMLCanvasElement {
  const textCanvas = makeTextCanvas(width, height, x, y, text, font, 'rgba(0, 0, 0, 0.5)')
  const context = textCanvas.getContext('2d')!

  context.beginPath()
  context.setLineDash([5, 5])
  context.lineWidth = 2
  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.strokeText(text, x, y - measurements.yOffset)
  context.closePath()
  context.setLineDash([])

  const rulerY = y - measurements.yOffset * 2 - measurements.textHeight * 0.5
  drawRuler(context, width * 0.5 + measurements.textWidth * 0.5, rulerY, rulerY + measurements.yOffset, 'offset: ' + measurements.yOffset.toFixed(2) + 'px')

  return textCanvas
}

function maskCanvas (source: HTMLCanvasElement, mask: HTMLCanvasElement): HTMLCanvasElement {
  const context = makeContext(source.width, source.height)
  context.drawImage(source, 0, 0)
  context.globalCompositeOperation = 'destination-in'
  context.drawImage(mask, 0, 0)
  context.globalCompositeOperation = 'source-over'
  return context.canvas
}

function measureText (text: string, font: string) {
  const w = 2048
  const h = 2048
  const context = makeContext(w, h)
  const y = h / 2
  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const metrics = context.measureText(text)

  const textWidth = metrics.width
  const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  const textTop = y - metrics.actualBoundingBoxAscent

  const yOffset = y - (textTop + textHeight * 0.5)

  return {
    textWidth,
    textHeight,
    yOffset,
    edgeLength: Math.max(textWidth, textHeight)
  }
}

export default async function (options: Partial<Options> = {}):Promise<CirclePacker | Record<string, any>> {
  const circlePackerDefaultOptions: Partial<circlePackerOptions> = {}

  const defaultOptions: Options = {
    textColors: [
      '#ffffff'
    ],
    backgroundColors: [
      '#000000'
    ],
    text: '8',
    font: 'bold 256px sans-serif',
    padding: '20%',
    margin: '10%',
    circlePackerOptions: circlePackerDefaultOptions,
    radius: 'auto',
    debug: false,
  }

  const mergedOptions:Options = {
    ...defaultOptions,
    ...options,
    circlePackerOptions: {
      ...defaultOptions.circlePackerOptions,
      ...options.circlePackerOptions,
    }
  }

  mergedOptions.text = mergedOptions.text.slice(0, 2)

  const measurement = measureText(mergedOptions.text, mergedOptions.font)

  const innerRadius = mergedOptions.radius === 'auto' ? measurement.edgeLength / 2 : mergedOptions.radius
  const backgroundRadius = applySpacing(innerRadius, mergedOptions.padding)
  const edgeLength = applySpacing(backgroundRadius * 2, mergedOptions.margin)
  const textX = edgeLength * 0.5
  const textY = edgeLength * 0.5 + measurement.yOffset

  const text = makeTextCanvas(edgeLength, edgeLength, textX, textY, mergedOptions.text, mergedOptions.font)

  const backgroundMaskContext = makeContext(edgeLength, edgeLength)
  backgroundMaskContext.beginPath()
  backgroundMaskContext.arc(edgeLength * 0.5, edgeLength * 0.5, backgroundRadius, 0, Math.PI * 2)
  backgroundMaskContext.fill()
  backgroundMaskContext.closePath()

  const background = maskCanvas(makeFilledCanvas(edgeLength, edgeLength, mergedOptions.backgroundColors), backgroundMaskContext.canvas)
  const foreground = maskCanvas(makeFilledCanvas(edgeLength, edgeLength, mergedOptions.textColors), text)

  const mergedContext = makeContext(edgeLength, edgeLength)
  mergedContext.drawImage(background, 0, 0)
  mergedContext.drawImage(foreground, 0, 0)

  if (mergedOptions.debug) {
    const debugContext = makeContext(edgeLength * 4, edgeLength)
    debugContext.fillStyle = 'rgb(255, 255, 255)'
    debugContext.fillRect(0, 0, edgeLength * 4, edgeLength)

    const textCorrectionCanvas = makeTextCorrectionCanvas(edgeLength, edgeLength, textX, textY, mergedOptions.text, mergedOptions.font, measurement)
    debugContext.drawImage(textCorrectionCanvas, 0, 0)
    debugContext.drawImage(mergedContext.canvas, edgeLength * 2, 0)

    const circlepackerInstance = await fromCanvas(mergedContext.canvas, mergedOptions.circlePackerOptions)
    const packedCanvas = circlepackerInstance.asCanvas({ scale: 1 })

    debugContext.drawImage(packedCanvas, edgeLength * 3, 0)

    const positionContext = makeContext(edgeLength, edgeLength)
    positionContext.drawImage(text, 0, 0)
    positionContext.fillStyle = 'rgba(255, 255, 255, 0.75)'
    positionContext.beginPath()
    positionContext.rect(0, 0, edgeLength, edgeLength)
    positionContext.fill()
    positionContext.closePath()

    positionContext.drawImage(makePositionDebugCanvas({
      innerRadius,
      backgroundRadius,
      edgeLength,
      mergedOptions
    }, edgeLength, edgeLength), 0, 0)

    debugContext.drawImage(positionContext.canvas, edgeLength, 0)

    return new Proxy({}, {
      get () {
        return function () { return debugContext.canvas }
      }
    })
  }

  return await fromCanvas(mergedContext.canvas, mergedOptions.circlePackerOptions)
}
