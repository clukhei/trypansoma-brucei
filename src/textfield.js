// Text field renderer
//
// Uses @chenglou/pretext for accurate variable-width line layout.
// The text flows around the T. brucei cell body (two segments per row:
// left and right of the organism's bounding box).
//
// A second pass renders the outline cells in neon green — these ARE the
// parasite shape. As the organism moves, different grid cells light up.

import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import { CORPUS } from './content.js'
import { getRowBounds, getOutlineCells, getFlagellumCells } from './trypanosoma.js'

const NEON          = '#39FF14'
const FLAGELLUM_RED = '#FF3D3D'  // Bright red for flagellum
const DAPI_BLUE     = '#1E90FF'  // DAPI fluorescence color
const TEXT_COLOR    = 'rgba(148, 168, 140, 0.22)'
const PADDING       = 10   // px margin from canvas edge
const AABB_PAD_X    = 14   // extra horizontal clearance around cell body
const AABB_PAD_Y    = 6    // extra vertical clearance

let _prepared  = null
let _font      = ''
let _charW     = 0
let _lineH     = 0

// Call once (or on font change). Returns charW so main.js can store it.
export function initTextField(font, lineH) {
  _font     = font
  _lineH    = lineH
  _prepared = prepareWithSegments(CORPUS, font)

  // Measure monospace character width via an off-screen canvas
  const tmp = document.createElement('canvas')
  const ctx = tmp.getContext('2d')
  ctx.font  = font
  _charW    = ctx.measureText('M').width

  return _charW
}

// Main render call — invoke once per animation frame.
// Can accept a single state or an array of states
export function renderTextField(ctx, W, H, stateOrStates) {
  if (!_prepared) return

  // Handle both single state and array of states
  const states = Array.isArray(stateOrStates) ? stateOrStates : [stateOrStates]

  const charW     = _charW
  const lineH     = _lineH
  const rows      = Math.ceil(H / lineH)

  // Get bounds from all organisms (keep separate, not merged)
  const allRowBounds = []
  for (const state of states) {
    allRowBounds.push(getRowBounds(state, lineH, H, AABB_PAD_X, AABB_PAD_Y, W, H))
  }

  // ── Pass 1: background text (dim), flowing around organism outline ─────────
  ctx.font      = _font
  ctx.fillStyle = TEXT_COLOR
  ctx.shadowBlur = 0

  // Single cursor that advances linearly through the corpus.
  // pretext's layoutNextLine is pure arithmetic over cached widths — cheap.
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }

  for (let row = 0; row < rows; row++) {
    const rowTop = row * lineH
    // Baseline position (~85% down the line cell)
    const baseline = rowTop + lineH * 0.82

    // Collect all organism bounds for this row
    const orgBoundsForRow = []
    for (const rowBounds of allRowBounds) {
      if (rowBounds[row]) {
        orgBoundsForRow.push(rowBounds[row])
      }
    }

    if (orgBoundsForRow.length === 0) {
      // No organisms on this row - full-width text
      const maxW = W - 2 * PADDING
      const line = layoutNextLine(_prepared, cursor, maxW)
      if (line) {
        ctx.fillText(line.text, PADDING, baseline)
        cursor = line.end
      }
    } else {
      // Sort bounds by minX for proper segment rendering
      orgBoundsForRow.sort((a, b) => a.minX - b.minX)

      // Render text in segments around organisms
      let currentX = PADDING
      for (const org of orgBoundsForRow) {
        // Left segment before this organism
        const leftMaxW = Math.max(0, org.minX - currentX)
        if (leftMaxW > 0) {
          const line = layoutNextLine(_prepared, cursor, leftMaxW)
          if (line) {
            ctx.fillText(line.text, currentX, baseline)
            cursor = line.end
          }
        }
        currentX = org.maxX
      }

      // Right segment after all organisms
      const rightMaxW = Math.max(0, W - currentX - PADDING)
      if (rightMaxW > 0) {
        const line = layoutNextLine(_prepared, cursor, rightMaxW)
        if (line) {
          ctx.fillText(line.text, currentX, baseline)
          cursor = line.end
        }
      }
    }
  }

  // ── Pass 2: outline cells — render all parasites ─────────────
  // Merge outline cells from all organisms
  const allOutlineCells = new Set()
  const allFlagellumCells = new Set()

  for (const state of states) {
    const outlineCells = getOutlineCells(state, charW, lineH, W, H, PADDING, W, H)
    const flagellumCells = getFlagellumCells(state, charW, lineH, W, H, PADDING, W, H)
    outlineCells.forEach(cell => allOutlineCells.add(cell))
    flagellumCells.forEach(cell => allFlagellumCells.add(cell))
  }

  const outlineCells = allOutlineCells
  const flagellumCells = allFlagellumCells

  ctx.fillStyle  = NEON
  ctx.shadowBlur = 18
  ctx.shadowColor = NEON

  // Render only the outer edge of cell body (outline only, not filled)
  ctx.font = _font
  for (const key of outlineCells) {
    if (flagellumCells.has(key)) continue  // Skip flagellum cells

    const col = key % 2000
    const row = Math.floor(key / 2000)

    // Only render if on the edge: check if adjacent cells are NOT in outlineCells
    const isEdge =
      !outlineCells.has((col - 1) + row * 2000) ||
      !outlineCells.has((col + 1) + row * 2000) ||
      !outlineCells.has(col + (row - 1) * 2000) ||
      !outlineCells.has(col + (row + 1) * 2000)

    if (!isEdge) continue  // Skip interior cells

    const x   = PADDING + col * charW
    const y   = row * lineH + lineH * 0.82

    const charIdx = (col * 137 + row * 431) % CORPUS.length
    ctx.fillText(CORPUS[charIdx], x, y)
  }

  // Render flagellum with bold font and red color
  ctx.font = 'bold ' + _font
  ctx.fillStyle = FLAGELLUM_RED
  ctx.shadowColor = FLAGELLUM_RED
  for (const key of flagellumCells) {
    const col = key % 2000
    const row = Math.floor(key / 2000)
    const x   = PADDING + col * charW
    const y   = row * lineH + lineH * 0.82

    const charIdx = (col * 137 + row * 431) % CORPUS.length
    ctx.fillText(CORPUS[charIdx], x, y)
  }

  // ── Pass 3: DAPI-stained organelles rendered for all organisms ────────────
  ctx.font = _font
  ctx.shadowBlur = 14
  ctx.shadowColor = DAPI_BLUE

  // Helper function: fill cells within circular organelle
  const fillOrganelle = (centerX, centerY, radius, alpha = 1.0) => {
    ctx.fillStyle = DAPI_BLUE
    ctx.globalAlpha = alpha

    const minCol = Math.max(0, Math.floor((centerX - radius - PADDING) / charW))
    const maxCol = Math.min(Math.floor((W - PADDING) / charW), Math.ceil((centerX + radius - PADDING) / charW))
    const minRow = Math.max(0, Math.floor((centerY - radius) / lineH))
    const maxRow = Math.min(rows, Math.ceil((centerY + radius) / lineH))

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const x = PADDING + col * charW
        const y = row * lineH + lineH * 0.82

        // Check if cell center is within organelle circle
        const dx = x - centerX
        const dy = y - centerY
        if (dx * dx + dy * dy <= radius * radius) {
          const charIdx = (col * 137 + row * 431) % CORPUS.length
          ctx.fillText(CORPUS[charIdx], x, y)
        }
      }
    }
    ctx.globalAlpha = 1.0
  }

  // Render organelles from all organisms
  for (const state of states) {
    const { nucleusX, nucleusY, nucleusRadius,
            nucleolusX, nucleolusY, nucleolusRadius,
            kinetoplastX, kinetoplastY, kinetoplastRadius,
            canvasW, canvasH } = state

    // Wrap organelle positions for seamless toroidal rendering
    const wrappedNucleusX = ((nucleusX % canvasW) + canvasW) % canvasW
    const wrappedNucleusY = ((nucleusY % canvasH) + canvasH) % canvasH
    const wrappedNucleolusX = ((nucleolusX % canvasW) + canvasW) % canvasW
    const wrappedNucleolusY = ((nucleolusY % canvasH) + canvasH) % canvasH
    const wrappedKinetoplastX = ((kinetoplastX % canvasW) + canvasW) % canvasW
    const wrappedKinetoplastY = ((kinetoplastY % canvasH) + canvasH) % canvasH

    // Render organelles (kinetoplast → nucleus → nucleolus for proper layering)
    fillOrganelle(wrappedKinetoplastX, wrappedKinetoplastY, kinetoplastRadius, 0.95)
    fillOrganelle(wrappedNucleusX, wrappedNucleusY, nucleusRadius, 0.85)
    fillOrganelle(wrappedNucleolusX, wrappedNucleolusY, nucleolusRadius, 1.0)
  }

  // Reset shadow (avoid bleeding onto overlay HTML)
  ctx.shadowBlur = 0
}
