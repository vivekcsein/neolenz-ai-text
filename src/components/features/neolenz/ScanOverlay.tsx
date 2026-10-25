const CORNERS = ["tl", "tr", "bl", "br"] as const;

/**
 * Full-image scanning effect. Pure CSS (transform and opacity), always
 * clipped to the frame it sits in. No detections are implied: it only says
 * "analysis in progress".
 */
export const ScanOverlay = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
  >
    <div className="neolenz-scan-tint" />
    <div className="neolenz-scan-grid" />
    <div className="neolenz-scan-beam" />
    {CORNERS.map((position) => (
      <span key={position} className="neolenz-bracket" data-pos={position} />
    ))}
  </div>
);
