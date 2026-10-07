/**
 * Procedurally generated sample CT slice.
 *
 * Used by the guided demonstration so the CT workflow can be shown on a projector
 * without any external file. It is a **synthetic phantom image**, clearly labelled
 * as such in the interface — it is not a real patient scan.
 */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function octave(rand: () => number, size: number): Float32Array {
  const grid = new Float32Array(size * size)
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand()
  return grid
}

function sampleGrid(grid: Float32Array, size: number, u: number, v: number): number {
  const x = u * (size - 1)
  const y = v * (size - 1)
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(size - 1, x0 + 1)
  const y1 = Math.min(size - 1, y0 + 1)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = grid[y0 * size + x0] * (1 - sx) + grid[y0 * size + x1] * sx
  const bottom = grid[y1 * size + x0] * (1 - sx) + grid[y1 * size + x1] * sx
  return top * (1 - sy) + bottom * sy
}

function fbm(grids: Float32Array[], sizes: number[], u: number, v: number): number {
  let value = 0
  let amplitude = 0.5
  let total = 0
  for (let i = 0; i < grids.length; i += 1) {
    value += sampleGrid(grids[i], sizes[i], u, v) * amplitude
    total += amplitude
    amplitude *= 0.5
  }
  return value / total
}

function ellipse(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation = 0,
): number {
  const dx = x - cx
  const dy = y - cy
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const px = (dx * cos + dy * sin) / rx
  const py = (-dx * sin + dy * cos) / ry
  return px * px + py * py
}

export const SAMPLE_CT_SIZE = 512
export const SAMPLE_CT_FILE_NAME = 'sample-lung-ct-phantom.png'

/** Builds a synthetic axial chest phantom as a PNG File. */
export async function createSampleCtFile(): Promise<File> {
  const size = SAMPLE_CT_SIZE
  const rand = mulberry32(778291)
  const gridSizes = [8, 16, 32, 64]
  const grids = gridSizes.map((gridSize) => octave(rand, gridSize))

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  const image = context.createImageData(size, size)
  const data = image.data

  const bodyCx = size / 2
  const bodyCy = size / 2

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      const v = y / size
      const texture = fbm(grids, gridSizes, u, v)
      let value = 6 + texture * 8

      // Soft tissue body wall
      const body = ellipse(x, y, bodyCx, bodyCy, size * 0.42, size * 0.36)
      if (body < 1) {
        const falloff = 1 - body
        value = 74 + falloff * 26 + texture * 22

        // Lung fields
        const leftLung = ellipse(x, y, bodyCx - size * 0.115, bodyCy - size * 0.02, size * 0.135, size * 0.185, -0.08)
        const rightLung = ellipse(x, y, bodyCx + size * 0.115, bodyCy - size * 0.02, size * 0.135, size * 0.185, 0.08)
        const inLung = Math.min(leftLung, rightLung)
        if (inLung < 1) {
          const depth = 1 - inLung
          value = 18 + depth * 26 + texture * 20
          // Vascular markings
          const vessel = Math.abs(Math.sin((x + texture * 60) * 0.16) * Math.cos(y * 0.09))
          if (vessel > 0.965 - depth * 0.12) value += 46
        }

        // Mediastinum / heart
        const heart = ellipse(x, y, bodyCx, bodyCy + size * 0.075, size * 0.105, size * 0.115)
        if (heart < 1) value = 96 + (1 - heart) * 34 + texture * 18

        // Spine
        const spine = ellipse(x, y, bodyCx, bodyCy + size * 0.245, size * 0.055, size * 0.05)
        if (spine < 1) value = 176 + (1 - spine) * 62

        // Rib cross-sections along the body wall
        const angle = Math.atan2(y - bodyCy, x - bodyCx)
        const ribRing = ellipse(x, y, bodyCx, bodyCy, size * 0.365, size * 0.305)
        if (ribRing < 1 && ribRing > 0.86) {
          const ribs = Math.cos(angle * 9)
          if (ribs > 0.93) value = 168 + texture * 40
        }
      }

      // Synthetic focal opacity in the left lung field (phantom lesion)
      const lesion = ellipse(x, y, bodyCx - size * 0.10, bodyCy - size * 0.115, size * 0.036, size * 0.030)
      if (lesion < 1) value = 118 + (1 - lesion) * 46 + texture * 14

      // Quantum noise
      value += (rand() - 0.5) * 13

      const clamped = Math.max(0, Math.min(255, value))
      const offset = (y * size + x) * 4
      data[offset] = clamped
      data[offset + 1] = clamped
      data[offset + 2] = clamped
      data[offset + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('Unable to encode the sample phantom image.'))
    }, 'image/png')
  })

  return new File([blob], SAMPLE_CT_FILE_NAME, { type: 'image/png' })
}
