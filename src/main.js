import { getTrypanosomaState } from './trypanosoma.js'
import { initTextField, renderTextField } from './textfield.js'

const FONT   = "11px 'Courier New', monospace"
const LINE_H = 15
const BG     = '#0a0a0a'

const canvas = document.getElementById('canvas')
const ctx    = canvas.getContext('2d')

let W = 0
let H = 0

function resize() {
  const dpr = window.devicePixelRatio || 1
  W = window.innerWidth
  H = window.innerHeight
  canvas.width  = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  canvas.style.width  = W + 'px'
  canvas.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function frame(ts) {
  const t = ts / 1000

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // Create three organisms with different movement paths
  const states = [
    getTrypanosomaState(t, W, H, 0),           // Organism 1
    getTrypanosomaState(t + 2, W, H, 2.0),    // Organism 2 (time offset + phase shift)
    getTrypanosomaState(t + 4, W, H, 4.0),    // Organism 3 (time offset + phase shift)
  ]

  // Render text once with all organisms overlaid
  renderTextField(ctx, W, H, states)

  requestAnimationFrame(frame)
}

resize()
initTextField(FONT, LINE_H)

window.addEventListener('resize', () => {
  resize()
  initTextField(FONT, LINE_H)
})

requestAnimationFrame(frame)
