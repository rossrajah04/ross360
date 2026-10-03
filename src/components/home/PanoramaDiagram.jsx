import { useId } from 'react';

// A room drawn as a 360° panorama (equirectangular projection): straight walls, windows and doorways
// become the curves seen in a real 360° image. A frame the width of one view moves slowly across it,
// to show that a visitor chooses where to look. It is a diagram, not a tour, and cannot be dragged.
// When a 360° image exists (pano-tour in media.js) it is shown in place of the drawn room.

const W = 3600; // 10 units per degree of longitude
const H = 1000; // latitudes from +50° to -50°
const VIEW = 900; // one view: 90°
const CEILING = 0.62;
const FLOOR = -0.85;
const deg = 180 / Math.PI;

// Longitudes are not wrapped: the 0° wall runs from -45° to 45°, and anything left of 0° is drawn a
// second time 360° further on, so it continues across the edge of the image.
const toXY = (lon, lat) => [lon * 10, (50 - lat) * 10];

// A point on the wall facing `normal` (degrees), `t` along the wall (-1 to 1) and `z` high.
function wallPoint(normal, t, z) {
  return [normal + Math.atan(t) * deg, Math.atan(z / Math.hypot(1, t)) * deg];
}

// A horizontal line along a wall, sampled so it curves as it should.
function wallLine(normal, t0, t1, z, steps = 24) {
  return Array.from({ length: steps + 1 }, (_, i) => wallPoint(normal, t0 + ((t1 - t0) * i) / steps, z));
}

function wallRect(normal, t0, t1, z0, z1) {
  return [...wallLine(normal, t0, t1, z1), ...wallLine(normal, t1, t0, z0), wallPoint(normal, t0, z1)];
}

const vertical = (normal, t, z0, z1) => [wallPoint(normal, t, z0), wallPoint(normal, t, z1)];

const SHAPES = [
  ...[0, 90, 180, 270].flatMap((normal) => [
    wallLine(normal, -1, 1, CEILING),
    wallLine(normal, -1, 1, FLOOR),
    vertical(normal, 1, CEILING, FLOOR), // corner
  ]),
  wallRect(0, -0.24, 0.24, FLOOR, 0.22), // doorway into the next space
  wallRect(90, -0.58, 0.58, -0.22, 0.44), // window
  vertical(90, -0.19, -0.22, 0.44),
  vertical(90, 0.19, -0.22, 0.44),
  wallRect(180, 0.32, 0.64, FLOOR, 0.26), // door
  wallRect(270, -0.72, -0.08, -0.18, 0.4), // window
  vertical(270, -0.4, -0.18, 0.4),
];

const toPath = (points, shift) =>
  points
    .map(([lon, lat], i) => {
      const [x, y] = toXY(lon + shift, lat);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join('');

const ROOM = SHAPES.flatMap((points) =>
  points.some(([lon]) => lon < 0) ? [toPath(points, 0), toPath(points, 360)] : [toPath(points, 0)],
);

// Viewpoints on the floor, at distance `r` in direction `lon`, flattened by perspective.
function floorMark(lon, r) {
  const [x, y] = toXY(lon, Math.atan(FLOOR / r) * deg);
  return { cx: x, cy: y, rx: 110 / r, ry: 34 / r };
}

const MARKS = [floorMark(0, 1.6), floorMark(360, 1.6), floorMark(150, 1.05)];
const MERIDIANS = Array.from({ length: 13 }, (_, i) => i * 300);

function Layer({ pano }) {
  return pano ? (
    <image
      href={`/images/home/${pano.file}-${pano.data.widths[0]}.jpg`}
      x="0"
      y="-400"
      width={W}
      height="1800"
      preserveAspectRatio="none"
    />
  ) : (
    <>
      {ROOM.map((d) => (
        <path key={d} d={d} />
      ))}
      {MARKS.map((m) => (
        <ellipse key={m.cx} {...m} />
      ))}
    </>
  );
}

export default function PanoramaDiagram({ label, pano = null }) {
  const clip = `pd-${useId().replace(/:/g, '')}`;
  return (
    <div className="pd">
      <svg className="pd__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
        <defs>
          <clipPath id={clip}>
            <rect className="pd__move" width={VIEW} height={H} />
          </clipPath>
        </defs>
        <g className="pd__grid">
          {MERIDIANS.map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2={H} />
          ))}
          <line className="pd__horizon" x1="0" y1={H / 2} x2={W} y2={H / 2} />
        </g>
        <g className="pd__dim">
          <Layer pano={pano} />
        </g>
        <g className="pd__lit" clipPath={`url(#${clip})`}>
          <Layer pano={pano} />
        </g>
        <rect className="pd__move pd__frame" width={VIEW} height={H} />
      </svg>
      <ol className="pd__scale" aria-hidden="true">
        {[0, 90, 180, 270, 360].map((d) => (
          <li key={d}>{d}°</li>
        ))}
      </ol>
    </div>
  );
}
