/** Lightweight (no three.js) mapping from a project to its 3D model, safe to import anywhere. */
export type PresetId = 'skyview' | 'highlife' | 'edge' | 'signature'

export function presetFor(image: string, name: string): PresetId {
  if (image.includes('1545324418')) return 'skyview'
  if (image.includes('1512917774080')) return 'highlife'
  if (image.includes('1486406146926')) return 'edge'
  if (image.includes('1600585154340')) return 'signature'
  const n = name.toLowerCase()
  if (n.includes('villa')) return 'signature'
  if (n.includes('edge')) return 'edge'
  if (n.includes('highlife')) return 'highlife'
  return 'skyview'
}
