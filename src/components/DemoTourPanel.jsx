// Temporary visual treatment used until a genuine ROSS 360 tour is available.
// It is an abstract illustration, NOT a photograph or a tour, and it is always labelled as a demo.
export default function DemoTourPanel({ caption = 'Illustrative placeholder. No tour is loaded.' }) {
  return (
    <div className="tour-stage__demo">
      <svg
        viewBox="0 0 800 450"
        role="img"
        aria-label="Abstract illustration of a 360 degree panorama grid. Demonstration only."
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="800" height="450" fill="#141416" />
        <g fill="none" stroke="#3a3c41" strokeWidth="1">
          <line x1="0" y1="225" x2="800" y2="225" />
          <path d="M0 150 Q400 120 800 150" />
          <path d="M0 300 Q400 330 800 300" />
          <path d="M0 80 Q400 40 800 80" />
          <path d="M0 370 Q400 410 800 370" />
          <path d="M400 0 Q400 225 400 450" />
          <path d="M260 0 Q300 225 260 450" />
          <path d="M540 0 Q500 225 540 450" />
          <path d="M120 0 Q190 225 120 450" />
          <path d="M680 0 Q610 225 680 450" />
        </g>
        <g fill="none" stroke="#f4f4f5" strokeWidth="1.5">
          <circle cx="400" cy="225" r="14" />
          <circle cx="250" cy="262" r="9" opacity="0.7" />
          <circle cx="565" cy="258" r="9" opacity="0.7" />
        </g>
        <circle cx="400" cy="225" r="4" fill="#f4f4f5" />
      </svg>
      <p className="tour-stage__caption">{caption}</p>
    </div>
  );
}
