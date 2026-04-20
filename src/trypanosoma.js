// T. brucei motility — real biophysical math
//
// Swimming at low Reynolds number (Re ~ 1e-4): inertia is irrelevant,
// viscosity dominates. Resistive Force Theory gives propulsion from the
// anisotropy C_n ≈ 2·C_t of a slender flagellum.
//
// Flagellar traveling wave:
//   y(s, t) = A · sin(k·s − ω·t)
//   where k = 2π/λ,  ω = 2π·f,  s = arc length along flagellum

const TWO_PI = Math.PI * 2

// --- Reference dimensions (base scale) ---
const REFERENCE_WIDTH = 1200   // reference screen width for scaling

// --- Wave parameters (biophysically scaled to screen pixels) ---
// Base values at reference width
const WAVE_AMP_BASE    = 19.5       // A — amplitude (px) [13 × 1.5]
const WAVE_LAMBDA_BASE = 127.5      // λ — wavelength (px) [85 × 1.5]
const WAVE_FREQ   = 0.85            // f — frequency (Hz); ~20 Hz in vivo, slowed for visibility

// --- Cell body geometry (slender fusiform shape) ---
// Base values at reference width
const BODY_A_BASE      = 130.5      // semi-major axis (half-length along swim axis) [87 × 1.5]
const BODY_B_BASE      = 24         // semi-minor axis (half-width) — more slender [16 × 1.5]
const FLAG_LEN_BASE    = BODY_A_BASE * 2.6  // free flagellum length past posterior end
const FLAG_SAMPLES = 220            // sample points for polyline

// --- Locomotion ---
// Base values at reference width
const SWIM_SPEED_BASE  = 116        // px / s  (left → right sweep) — BSF T. brucei ~20 µm/s at 5.8 px/µm scale
const SWIM_AMP_BASE    = 52         // vertical sinusoidal undulation amplitude (px)

// Helper: Calculate scale factor based on canvas width
// Inverse scaling: smaller screens get larger organisms for better visibility
function getScaleFactor(canvasW) {
  return Math.min(REFERENCE_WIDTH / canvasW, 2.5)  // Inverse: smaller screens = larger scale, cap at 2.5x
}

// --- Boundary sampling ---
const ELLIPSE_SAMPLES = 280    // points sampled on cell body outline per frame

export function getTrypanosomaState(t, canvasW, canvasH, seed = 0) {
  // Calculate responsive scale factor based on canvas width
  const scale = getScaleFactor(canvasW)

  // Scaled organism parameters
  const BODY_A = BODY_A_BASE * scale
  const BODY_B = BODY_B_BASE * scale
  const FLAG_LEN = FLAG_LEN_BASE * scale
  const WAVE_AMP = WAVE_AMP_BASE * scale
  const WAVE_LAMBDA = WAVE_LAMBDA_BASE * scale
  const WAVE_K = TWO_PI / WAVE_LAMBDA
  const WAVE_OMEGA = TWO_PI * WAVE_FREQ
  const SWIM_SPEED = SWIM_SPEED_BASE * scale
  const SWIM_AMP = SWIM_AMP_BASE * scale

  // Immediate seamless wrapping for toroidal viewport
  // Offset each organism to different starting positions based on seed
  const baseOffsetX = (seed % 3) * (canvasW / 3.5)
  const baseOffsetY = Math.floor(seed / 3) * (canvasH / 3)

  const centerX = (canvasW * 0.5 + baseOffsetX) % canvasW
  const centerY = (canvasH * 0.5 + baseOffsetY) % canvasH

  // Forbidden zone: cell cannot penetrate this ellipse
  const forbiddenRadiusX = 300 * scale  // horizontal radius (scaled)
  const forbiddenRadiusY = 220 * scale  // vertical radius (scaled)

  // Spiral swimming trajectory with corkscrew motion
  // T. brucei: ~20 µm/s = ~116 px/s (constant velocity)
  const angularVelocity = 0.35  // rad/s
  const orbitRadius = 360 * scale       // px base orbit radius (scaled)
  const angle = t * angularVelocity

  // Random direction swimming with constant speed and smooth screen wrapping
  const swimSpeedConstant = 375 * scale  // px/s CONSTANT movement speed (scaled)

  // Smooth bounded direction angle with seed-based variation for different paths
  // Different organisms have different movement patterns
  const directionAngle = Math.sin(t * 0.12 + seed) * 0.5 + Math.cos(t * 0.09 + seed * 0.7) * 0.4

  // Constant velocity components (magnitude is always swimSpeed)
  const vx = Math.cos(directionAngle) * swimSpeedConstant
  const vy = Math.sin(directionAngle) * swimSpeedConstant

  // Proper position accumulation with bounded direction
  // Integrate velocity properly: position = center + ∫velocity dt
  const posX = swimSpeedConstant * (Math.sin(t * 0.12) / 0.12 - Math.cos(t * 0.09) / 0.09) / 10
  const posY = swimSpeedConstant * (-Math.cos(t * 0.12) / 0.12 + Math.sin(t * 0.09) / 0.09) / 10

  // Keep unwrapped position for all calculations
  // Wrapping happens only during rendering for perfect precision
  const cx = centerX + posX
  const cy = centerY + posY

  // Store canvas dimensions in state for rendering
  // This allows rendering to wrap at correct positions

  // Heading angle: pointing in swim direction
  const headingAngle = directionAngle

  // Body curvature: subtle S-like bending due to corkscrew motion (time-dependent)
  const bodyBend = Math.sin(t * 1.5) * 0.2  // much smaller corkscrew spiral
  const effectiveAngle = headingAngle + bodyBend
  const cosA = Math.cos(effectiveAngle)
  const sinA = Math.sin(effectiveAngle)

  // Flagellum: runs along cell body from posterior to anterior, then extends free
  // Anterior end of cell body
  const antX = cx + BODY_A * cosA
  const antY = cy + BODY_A * sinA

  // Posterior end of cell body (flagellum attachment point)
  // Apply body curvature: S-bend creates lateral offset along the body
  const bodyBendAmount = Math.sin(t * 1.2) * 0.45
  const postX = cx - BODY_A * cosA + bodyBendAmount * 20 * scale * (-sinA)
  const postY = cy - BODY_A * sinA + bodyBendAmount * 20 * scale * cosA

  // Attached flagellum portion: runs along ventral edge of cell body (posterior → anterior)
  const flagPoints = []
  const attachedSamples = Math.floor(FLAG_SAMPLES * 0.85)  // 85% of samples for attached portion (more green area)

  for (let i = 0; i <= attachedSamples; i++) {
    const t_attach = i / attachedSamples  // 0 to 1 along cell body length

    // Apply same S-curve bending as the body
    const bendCurve = Math.sin(Math.PI * t_attach) * Math.sin(t * 1.5) * 0.2
    const lateralOffset = bendCurve * 15 * scale  // scaled lateral offset

    // Interpolate from posterior to anterior along cell body with curve
    const posX = postX + t_attach * (2 * BODY_A) * cosA + lateralOffset * (-sinA)
    const posY = postY + t_attach * (2 * BODY_A) * sinA + lateralOffset * cosA

    // Offset to ventral side (perpendicular to swim axis)
    const offsetDist = BODY_B * 0.7  // slightly offset from cell edge
    const offsetX = posX - offsetDist * sinA
    const offsetY = posY + offsetDist * cosA

    flagPoints.push({ x: offsetX, y: offsetY })
  }

  // Free flagellum portion: extends beyond posterior (backward) with traveling wave
  const freeSamples = FLAG_SAMPLES - attachedSamples
  const freeFlagLen = FLAG_LEN * 0.15  // small free portion length (15% — more proportionate to real T. brucei)

  for (let i = 0; i <= freeSamples; i++) {
    const t_free = i / freeSamples  // 0 to 1 along free portion
    const s = t_free * freeFlagLen
    const wave = WAVE_AMP * Math.sin(WAVE_K * s - WAVE_OMEGA * t)

    // Apply S-curve bending to free portion too
    const bendCurve = Math.sin(t * 1.5) * 0.2
    const lateralOffset = bendCurve * 15 * scale

    // Start from posterior and extend backward (trailing behind) with undulation and S-curve
    const baseX = postX - t_free * freeFlagLen * cosA + lateralOffset * (-sinA)
    const baseY = postY - t_free * freeFlagLen * sinA + lateralOffset * cosA

    flagPoints.push({
      x: baseX + wave * (-sinA),
      y: baseY + wave * cosA,
    })
  }

  // --- Nuclear organelles (DAPI-stained) ---
  // Nucleus: positioned toward anterior, scaled with body length
  const nucleusCenterLocal = 22.5 * scale  // pixels toward anterior (scaled)
  const nucleusX = cx + nucleusCenterLocal * cosA
  const nucleusY = cy + nucleusCenterLocal * sinA
  const nucleusRadius = 14.625 * scale  // scaled nucleus radius

  // Nucleolus: inside nucleus
  const nucleolusX = nucleusX
  const nucleolusY = nucleusY
  const nucleolusRadius = 5.625 * scale  // scaled nucleolus radius

  // Kinetoplast (kDNA disc): near posterior end
  const kinetoplastLocal = -78.75 * scale  // pixels toward posterior (scaled)
  const kinetoplastX = cx + kinetoplastLocal * cosA
  const kinetoplastY = cy + kinetoplastLocal * sinA
  const kinetoplastRadius = 3.9375 * scale  // scaled kinetoplast radius

  return { cx, cy, angle, cosA, sinA, a: BODY_A, b: BODY_B, flagPoints, t,
           nucleusX, nucleusY, nucleusRadius,
           nucleolusX, nucleolusY, nucleolusRadius,
           kinetoplastX, kinetoplastY, kinetoplastRadius,
           canvasW, canvasH }  // Include for precise wrapping during rendering
}

// Helper: Get body width at a position along the length (bicone/spindle shape)
// t=0 is anterior (tapered to point), t=0.5 is widest (middle), t=1 is posterior (tapered to point)
function getBodyWidthAtLength(t, bodyB = BODY_B_BASE) {
  // Sinusoidal taper: tapers to a point at both ends, full width in middle
  const taper = Math.sin(t * Math.PI)  // 0 → 1 → 0 over the range [0, 1]
  return bodyB * taper
}

// Per-row x-extent of the organism (tapered cell body + flagellum).
// Returns an array of length Math.ceil(H/lineH); entry is null if the row
// doesn't overlap the organism, otherwise { minX, maxX } with padding applied.
//
// Body shape: asymmetrical taper (blunt anterior, pointed posterior)
export function getRowBounds(state, lineH, H, padX = 0, padY = 0, W = 800, screenH = 600) {
  const { cx, cy, cosA, sinA, a, b, flagPoints, canvasW, canvasH } = state
  const rows   = Math.ceil(H / lineH)
  const bounds = new Array(rows).fill(null)

  // Wrap position precisely at rendering time
  const wrappedCx = ((cx % canvasW) + canvasW) % canvasW
  const wrappedCy = ((cy % canvasH) + canvasH) % canvasH

  // --- Cell body: tapered shape (not a simple ellipse) ---
  const maxExtent = Math.sqrt((a * sinA) ** 2 + (b * cosA) ** 2)

  for (let row = 0; row < rows; row++) {
    const rowTop = row * lineH
    const rowBot = rowTop + lineH
    if (rowBot < wrappedCy - maxExtent - padY || rowTop > wrappedCy + maxExtent + padY) continue

    const rowMid = rowTop + lineH * 0.5
    const dy = rowMid - wrappedCy  // offset from cell center line

    // Find which positions along the body axis align with this row
    // Interpolate along the length to find width at this y position
    let minX = Infinity
    let maxX = -Infinity

    // Sample positions along curved body length
    for (let sample = 0; sample <= 100; sample++) {
      const t_pos = sample / 100  // 0 = anterior, 1 = posterior

      // S-curve bending: varies along body length with subtle spiral
      const bendCurve = Math.sin(Math.PI * t_pos) * Math.sin(state.t * 1.5) * 0.2
      const lateralOffset = bendCurve * 15  // minimal lateral displacement for small S-curve

      // Position along body with curve
      const posX = wrappedCx + (a * (1 - 2*t_pos)) * cosA + lateralOffset * (-sinA)
      const posY = wrappedCy + (a * (1 - 2*t_pos)) * sinA + lateralOffset * cosA

      const width = getBodyWidthAtLength(t_pos, b)

      // Check if this position is close to our row
      const distY = Math.abs(posY - rowMid)
      if (distY < lineH) {
        // Perpendicular width at this position
        const offsetX = width * cosA
        minX = Math.min(minX, posX - offsetX, posX + offsetX)
        maxX = Math.max(maxX, posX - offsetX, posX + offsetX)
      }
    }

    if (minX <= maxX) {
      bounds[row] = { minX: minX - padX, maxX: maxX + padX }
    }
  }

  // --- Flagellum points (with wrapping for consistency) ---
  for (const p of flagPoints) {
    // Wrap flagellum points same way as body for consistency
    const wrappedPx = ((p.x % canvasW) + canvasW) % canvasW
    const wrappedPy = ((p.y % canvasH) + canvasH) % canvasH

    const row = Math.floor(wrappedPy / lineH)
    if (row < 0 || row >= rows) continue
    if (bounds[row] === null) {
      bounds[row] = { minX: wrappedPx - padX, maxX: wrappedPx + padX }
    } else {
      if (wrappedPx - padX < bounds[row].minX) bounds[row].minX = wrappedPx - padX
      if (wrappedPx + padX > bounds[row].maxX) bounds[row].maxX = wrappedPx + padX
    }
  }

  return bounds
}

// Returns a Set<number> of encoded (col, row) grid cells on the flagellum polyline only.
// key encoding: col + row * MAX_COLS  (MAX_COLS = 2000, safe up to 4K)
export function getFlagellumCells(state, charW, lineH, W, H, padding, screenW = 800, screenH = 600) {
  const { flagPoints, canvasW, canvasH } = state
  const cols = Math.floor((W - 2 * padding) / charW)
  const rows = Math.ceil(H / lineH)
  const cells = new Set()

  // --- Flagellum polyline (with wrapping) ---
  for (const p of flagPoints) {
    // Wrap flagellum points same way as body
    const wrappedPx = ((p.x % canvasW) + canvasW) % canvasW
    const wrappedPy = ((p.y % canvasH) + canvasH) % canvasH

    const col = Math.round((wrappedPx - padding) / charW)
    const row = Math.round(wrappedPy / lineH)
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      cells.add(col + row * 2000)
    }
  }

  return cells
}

// Returns a Set<number> of encoded (col, row) grid cells that lie on the
// organism's outline (tapered cell body boundary + flagellum polyline).
// key encoding: col + row * MAX_COLS  (MAX_COLS = 2000, safe up to 4K)
export function getOutlineCells(state, charW, lineH, W, H, padding, screenW = 800, screenH = 600) {
  const { cx, cy, cosA, sinA, a, b, flagPoints, canvasW, canvasH } = state
  const cols = Math.floor((W - 2 * padding) / charW)
  const rows = Math.ceil(H / lineH)
  const cells = new Set()

  // Wrap position precisely at rendering time
  const wrappedCx = ((cx % canvasW) + canvasW) % canvasW
  const wrappedCy = ((cy % canvasH) + canvasH) % canvasH

  // --- Cell body curved tapered boundary ---
  // Sample along the curved length and width to trace the boundary
  for (let lenSample = 0; lenSample <= ELLIPSE_SAMPLES; lenSample++) {
    const t_pos = lenSample / ELLIPSE_SAMPLES  // 0 = anterior, 1 = posterior

    // S-curve bending: varies along body length with subtle spiral
    const bendCurve = Math.sin(Math.PI * t_pos) * Math.sin(state.t * 1.5) * 0.2
    const lateralOffset = bendCurve * 15  // minimal lateral displacement for small S-curve

    // Position along curved body
    const posX = wrappedCx + (a * (1 - 2*t_pos)) * cosA + lateralOffset * (-sinA)
    const posY = wrappedCy + (a * (1 - 2*t_pos)) * sinA + lateralOffset * cosA

    const width = getBodyWidthAtLength(t_pos, b)

    // Sample the width perpendicular to swim axis at this position
    for (let widthSample = 0; widthSample < 8; widthSample++) {
      const angle = (widthSample / 8) * TWO_PI
      const offsetX = width * Math.cos(angle) * cosA - width * Math.sin(angle) * sinA
      const offsetY = width * Math.cos(angle) * sinA + width * Math.sin(angle) * cosA

      const wx = posX + offsetX
      const wy = posY + offsetY

      const col = Math.round((wx - padding) / charW)
      const row = Math.round(wy / lineH)
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        cells.add(col + row * 2000)
      }
    }
  }

  // --- Flagellum polyline (with wrapping) ---
  for (const p of flagPoints) {
    // Wrap flagellum points same way as body
    const wrappedPx = ((p.x % canvasW) + canvasW) % canvasW
    const wrappedPy = ((p.y % canvasH) + canvasH) % canvasH

    const col = Math.round((wrappedPx - padding) / charW)
    const row = Math.round(wrappedPy / lineH)
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      cells.add(col + row * 2000)
    }
  }

  return cells
}
