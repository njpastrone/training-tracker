// Geometry for the sun arc (components/SunArc.tsx): a half circle over the horizon, one dot per
// target day rising from the left horizon to the top, the sun on the latest done day. A full week puts
// the sun at the top, full daylight, like the sky (services/sky.ts). Angles run from π (left horizon)
// to π/2 (top); the first dot is one step up, so a target of 1 puts its only dot at the top.
const HALO = 34; // the sun's halo radius in SunArc.tsx

export function sunArc(done: number, target: number, w: number, h: number) {
  const r = Math.min(w / 2, h) - HALO - 4;
  const cx = w / 2;
  const cy = h - 2;
  const at = (i: number) => {
    const angle = Math.PI * (1 - (i + 1) / (2 * target));
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const shown = Math.min(done, target);
  const dots = Array.from({ length: target }, (_, i) => ({ ...at(i), done: i < shown }));
  const sun = shown > 0 ? { x: dots[shown - 1].x, y: dots[shown - 1].y } : undefined;
  return { r, cx, cy, dots, sun, doneAngle: Math.PI * (1 - shown / (2 * target)) };
}
