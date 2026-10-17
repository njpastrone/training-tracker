// Geometry for the sun arc (components/SunArc.tsx): a half circle over the horizon, one dot per
// target day, the sun on the latest done day. Angles run from π (left horizon) to 0 (right horizon).
// The first dot is one step in from the left, so a target of 1 puts its only dot on the right horizon.
export function sunArc(done: number, target: number, w: number, h: number) {
  const r = Math.min(w / 2, h) - 12; // room for the sun's halo
  const cx = w / 2;
  const cy = h - 2;
  const at = (i: number) => {
    const angle = Math.PI * (1 - (i + 1) / target);
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const shown = Math.min(done, target);
  const dots = Array.from({ length: target }, (_, i) => ({ ...at(i), done: i < shown }));
  const sun = shown > 0 ? { x: dots[shown - 1].x, y: dots[shown - 1].y } : undefined;
  return { r, cx, cy, dots, sun, doneAngle: Math.PI * (1 - shown / target) };
}
