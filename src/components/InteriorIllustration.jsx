// Line drawing of an interior in one-point perspective, with connected viewpoints marked on the floor.
// Used only where no genuine photograph is available yet. It is an illustration of how a tour works,
// not a photograph, a render or a client project.
export default function InteriorIllustration({ className = '' }) {
  return (
    <svg
      className={`interior ${className}`.trim()}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" className="interior__structure">
        {/* Room edges */}
        <rect x="520" y="330" width="560" height="360" />
        <line x1="0" y1="0" x2="520" y2="330" />
        <line x1="1600" y1="0" x2="1080" y2="330" />
        <line x1="0" y1="1000" x2="520" y2="690" />
        <line x1="1600" y1="1000" x2="1080" y2="690" />
        {/* Back wall: doorway and window */}
        <path d="M590 690 V470 H690 V690" />
        <rect x="800" y="400" width="210" height="160" />
        <line x1="905" y1="400" x2="905" y2="560" />
        <line x1="800" y1="480" x2="1010" y2="480" />
        {/* Left wall window */}
        <path d="M180 308.8 L360 367.7 L360 573.8 L180 596.9 Z" />
        <line x1="270" y1="338.2" x2="270" y2="585.3" />
        {/* Right wall frame */}
        <path d="M1240 395.6 L1400 353.1 L1400 541.5 L1240 534.8 Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1" className="interior__detail">
        {/* Floor */}
        <line x1="200" y1="1000" x2="587.5" y2="690" />
        <line x1="500" y1="1000" x2="693.75" y2="690" />
        <line x1="800" y1="1000" x2="800" y2="690" />
        <line x1="1100" y1="1000" x2="906.25" y2="690" />
        <line x1="1400" y1="1000" x2="1012.5" y2="690" />
        <line x1="452.9" y1="730" x2="1147.1" y2="730" />
        <line x1="352.3" y1="790" x2="1247.7" y2="790" />
        <line x1="201.3" y1="880" x2="1398.7" y2="880" />
        {/* Ceiling */}
        <line x1="393.9" y1="250" x2="1206.1" y2="250" />
        <line x1="236.4" y1="150" x2="1363.6" y2="150" />
      </g>
      {/* Connected viewpoints */}
      <g className="interior__route" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 10">
        <path d="M800 840 L640 745" />
        <path d="M800 840 L985 750" />
      </g>
      <g className="interior__points" fill="none" stroke="currentColor" strokeWidth="2.5">
        <ellipse cx="800" cy="840" rx="46" ry="13" />
        <ellipse cx="640" cy="745" rx="26" ry="7.5" />
        <ellipse cx="985" cy="750" rx="26" ry="7.5" />
      </g>
      <ellipse className="interior__here" cx="800" cy="840" rx="12" ry="3.5" fill="currentColor" />
    </svg>
  );
}
