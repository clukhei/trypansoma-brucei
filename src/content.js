// Mixed vocabulary from T. brucei cell biology and design systems engineering.
// The two worlds this portfolio bridges.

const BIO = `VSG glycoprotein kinetoplast flagellum basal body procyclic \
bloodstream antigenic variation RNA editing mitochondria tubulin cytoskeleton \
endocytosis trypanothione GPI anchor variant surface glycoprotein sleeping sickness \
bloodstream form African trypanosomiasis trypanosome DAPI fluorescence \
immunofluorescence microscopy cell cycle kinetoplast DNA maxicircle minicircle \
RNA polymerase trans-splicing poly-A trypomastigote epimastigote T7 promoter \
tetracycline inducible propidium iodide FITC alexafluor confocal spinning disk \
flow cytometry western blot PCR qPCR gel electrophoresis SDS PAGE Bradford assay \
ELISA immunoprecipitation chromatin ChIP RNAi dsRNA siRNA knockout CRISPR cas9 \
homologous recombination transfection electroporation puromycin hygromycin \
blasticidin G418 selection marker surface coat density receptor recycling \
endosome lysosome proteasome ribosome mitoribosome editosome spliceosome \
kinetoplastid protozoa parasite host immune evasion VSG switching recombination \
procyclin GPEET EP metacyclic stumpy slender proliferative quiescent \
differentiation tsetse bloodmeal midgut proventriculus salivary gland `

const DESIGN = `design token component variant composition spacing typography \
color system storybook figma accessibility atomic design interaction pattern \
visual regression component API design language theming dark mode responsive \
grid layout flexbox breakpoint animation easing motion CSS custom property \
HSL OKLCH color contrast WCAG ARIA role landmark keyboard navigation focus \
management reducer state machine finite automaton transition guard action \
effect observer reactive stream debounce throttle virtual DOM reconciler \
diffing algorithm tree shaking bundle size lazy load code split performance \
lighthouse audit prop interface slot event emitter shadow DOM web component \
design engineer systems thinking modular reusable composable documented \
token primitive semantic alias brand palette elevation radius duration \
typeface weight tracking leading measure scale ratio proportional fluid \
clamp viewport intrinsic layout subgrid container query cascade layer \
color space gamut P3 display interpolation oklch hsl rgb hex alpha \
storybook chromatic snapshot baseline diff approval workflow automation `

// Interleave both domains so neither dominates the field
function interleave(a, b) {
  const wa = a.split(' ').filter(Boolean)
  const wb = b.split(' ').filter(Boolean)
  const out = []
  const len = Math.max(wa.length, wb.length)
  for (let i = 0; i < len; i++) {
    if (i < wa.length) out.push(wa[i])
    if (i < wb.length) out.push(wb[i])
  }
  return out.join(' ') + ' '
}

const BASE = interleave(BIO, DESIGN)

// Repeat enough to fill any viewport many times over without running out
export const CORPUS = BASE.repeat(20)
