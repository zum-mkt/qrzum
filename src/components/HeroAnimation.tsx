export function HeroAnimation({ className }: { className?: string }) {
  const cx = 250, cy = 250;
  const R = 168;
  const G = "#c08f44";

  const features = [
    { angle: -90, label: "IA", icon: "brain" },
    { angle: -30, label: "Analytics", icon: "chart" },
    { angle: 30, label: "Fluxo", icon: "workflow" },
    { angle: 90, label: "GPS", icon: "pin" },
    { angle: 150, label: "Presença", icon: "shield" },
    { angle: 210, label: "Formulários", icon: "file" },
  ].map((f, i) => ({
    ...f,
    x: cx + R * Math.cos((f.angle * Math.PI) / 180),
    y: cy + R * Math.sin((f.angle * Math.PI) / 180),
    delay: `${(i * 0.55).toFixed(2)}s`,
    pulseDur: "3.3s",
  }));

  // line visible from qr edge (~45px) to icon edge (~142px)
  // full line = R=168, dasharray total = 168
  const DASH = 16;
  const GAP = R - DASH; // 152

  return (
    <svg
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="ha-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ha-glow-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ha-glow-lg" x="-80%" y="-80%" width="360%" height="360%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="ha-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={G} stopOpacity="0.35" />
          <stop offset="100%" stopColor={G} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient glow behind QR */}
      <circle cx={cx} cy={cy} r="80" fill="url(#ha-orb)" />

      {/* Static dim connector lines */}
      {features.map((f) => (
        <line
          key={`l-${f.icon}`}
          x1={cx} y1={cy} x2={f.x} y2={f.y}
          stroke={G} strokeWidth="1" opacity="0.18"
        />
      ))}

      {/* Animated energy pulses */}
      {features.map((f) => (
        <line
          key={`p-${f.icon}`}
          x1={cx} y1={cy} x2={f.x} y2={f.y}
          stroke={G} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={`${DASH} ${GAP}`}
          filter="url(#ha-glow)"
          opacity="0"
        >
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.9;1"
            dur={f.pulseDur} begin={f.delay} repeatCount="indefinite" />
          <animate attributeName="stroke-dashoffset"
            from="0" to={`-${GAP}`}
            dur={f.pulseDur} begin={f.delay} repeatCount="indefinite" />
        </line>
      ))}

      {/* Feature icon circles */}
      {features.map((f) => (
        <g key={`ic-${f.icon}`}>
          {/* Glow ring that pulses when energy arrives */}
          <circle cx={f.x} cy={f.y} r="30" fill="none" stroke={G} strokeWidth="1.5" opacity="0">
            <animate attributeName="r" values="28;42;28" keyTimes="0;0.35;1"
              dur={f.pulseDur} begin={f.delay} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.5;0" keyTimes="0;0.35;1"
              dur={f.pulseDur} begin={f.delay} repeatCount="indefinite" />
          </circle>
          {/* Circle background */}
          <circle cx={f.x} cy={f.y} r="27"
            fill={`rgba(192,143,68,0.08)`} stroke={G} strokeWidth="1.5" opacity="0.7" />
          {/* Icon */}
          <FeatureIcon icon={f.icon} cx={f.x} cy={f.y} color={G} />
          {/* Label */}
          <text x={f.x} y={f.y + 43} textAnchor="middle"
            fill={G} fontSize="9.5" opacity="0.65" fontFamily="system-ui, sans-serif" fontWeight="500">
            {f.label}
          </text>
        </g>
      ))}

      {/* Central QR Code */}
      <QrCode cx={cx} cy={cy} color={G} />
    </svg>
  );
}

/* ── QR Code illustration ── */
function QrCode({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const s = 82;
  const x = cx - s / 2; // 209
  const y = cy - s / 2; // 209
  const m = s / 7;      // ~11.71px per module

  // helper for finder pattern (top-left origin)
  const Finder = ({ ox, oy }: { ox: number; oy: number }) => (
    <g>
      <rect x={ox} y={oy} width={m * 3} height={m * 3} fill={color} opacity="0.9" rx="2" />
      <rect x={ox + m * 0.7} y={oy + m * 0.7} width={m * 1.6} height={m * 1.6}
        fill="rgba(192,143,68,0.06)" rx="1" />
      <rect x={ox + m * 1.1} y={oy + m * 1.1} width={m * 0.8} height={m * 0.8}
        fill={color} opacity="0.9" rx="1" />
    </g>
  );

  // data dots pattern [col, row] in module units
  const dots: [number, number][] = [
    [3.6, 0.2], [4.4, 0.2], [5.5, 0.2],
    [0.2, 3.6], [0.2, 4.4], [0.2, 5.5],
    [3.6, 3.6], [4.8, 3.2], [5.8, 4.0],
    [3.2, 5.0], [4.5, 5.5], [5.8, 5.8], [6.5, 4.8],
    [4.0, 6.5], [5.5, 6.2], [6.5, 6.5],
    [6.5, 0.2], [6.5, 1.0], [6.2, 1.8],
  ];

  return (
    <g>
      {/* Outer card */}
      <rect x={x - 8} y={y - 8} width={s + 16} height={s + 16}
        rx="10" fill="rgba(192,143,68,0.07)" stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* Separator line (like QR quiet zone) */}
      <rect x={x} y={y} width={s} height={s} rx="2" fill="none" stroke={color} strokeWidth="0.5" opacity="0.2" />

      {/* Three finder patterns */}
      <Finder ox={x} oy={y} />
      <Finder ox={x + s - m * 3} oy={y} />
      <Finder ox={x} oy={y + s - m * 3} />

      {/* Data dots */}
      {dots.map(([dc, dr], i) => (
        <rect
          key={i}
          x={x + dc * m}
          y={y + dr * m}
          width={m * 0.65}
          height={m * 0.65}
          fill={color}
          opacity="0.65"
          rx="1"
        />
      ))}

      {/* Center pulsing glow */}
      <circle cx={cx} cy={cy} r="6" fill={color} opacity="0.6" filter="url(#ha-glow-lg)">
        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r="4" fill={color} opacity="0.9" filter="url(#ha-glow-sm)" />
    </g>
  );
}

/* ── Feature icon SVG paths (24×24 grid, centered) ── */
function FeatureIcon({ icon, cx, cy, color }: { icon: string; cx: number; cy: number; color: string }) {
  const t = `translate(${cx - 10}, ${cy - 10})`;
  const props = { fill: "none", stroke: color, strokeWidth: "1.7", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, opacity: 0.9 };

  switch (icon) {
    case "brain": // Sparkle / IA
      return (
        <g transform={t}>
          <path d="M10 2 L11.3 6.7 L16 8 L11.3 9.3 L10 14 L8.7 9.3 L4 8 L8.7 6.7 Z" {...props} fill={color} fillOpacity="0.25" />
          <path d="M16 3 L16.8 5.2 L19 6 L16.8 6.8 L16 9 L15.2 6.8 L13 6 L15.2 5.2 Z" {...props} strokeWidth="1.2" />
        </g>
      );
    case "chart": // BarChart3
      return (
        <g transform={t}>
          <rect x="3" y="10" width="3.5" height="8" rx="1" {...props} fill={color} fillOpacity="0.2" />
          <rect x="8" y="6" width="3.5" height="12" rx="1" {...props} fill={color} fillOpacity="0.2" />
          <rect x="13" y="2" width="3.5" height="16" rx="1" {...props} fill={color} fillOpacity="0.2" />
          <line x1="2" y1="18.5" x2="18" y2="18.5" {...props} />
        </g>
      );
    case "workflow": // Workflow / nodes
      return (
        <g transform={t}>
          <circle cx="4" cy="10" r="2.2" {...props} fill={color} fillOpacity="0.2" />
          <circle cx="16" cy="5" r="2.2" {...props} fill={color} fillOpacity="0.2" />
          <circle cx="16" cy="15" r="2.2" {...props} fill={color} fillOpacity="0.2" />
          <line x1="6.1" y1="9.1" x2="13.9" y2="5.9" {...props} />
          <line x1="6.1" y1="10.9" x2="13.9" y2="14.1" {...props} />
        </g>
      );
    case "pin": // MapPin / GPS
      return (
        <g transform={t}>
          <path d="M10 1 C6.13 1 3 4.13 3 8 C3 12.5 10 20 10 20 S17 12.5 17 8 C17 4.13 13.87 1 10 1Z"
            {...props} fill={color} fillOpacity="0.15" />
          <circle cx="10" cy="8" r="2.5" {...props} fill={color} fillOpacity="0.3" />
        </g>
      );
    case "shield": // Shield check
      return (
        <g transform={t}>
          <path d="M10 1 L3 4.5 V9.5 C3 13.75 6.08 17.7 10 19 C13.92 17.7 17 13.75 17 9.5 V4.5 Z"
            {...props} fill={color} fillOpacity="0.15" />
          <polyline points="6.5,10 9,12.5 13.5,7.5" {...props} />
        </g>
      );
    case "file": // FileText / Formulários
      return (
        <g transform={t}>
          <path d="M13 1 H5 C3.9 1 3 1.9 3 3 V17 C3 18.1 3.9 19 5 19 H15 C16.1 19 17 18.1 17 17 V5 Z"
            {...props} fill={color} fillOpacity="0.12" />
          <polyline points="13,1 13,5 17,5" {...props} />
          <line x1="6" y1="8.5" x2="14" y2="8.5" {...props} />
          <line x1="6" y1="11.5" x2="14" y2="11.5" {...props} />
          <line x1="6" y1="14.5" x2="10" y2="14.5" {...props} />
        </g>
      );
    default: return null;
  }
}
