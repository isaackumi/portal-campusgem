/**
 * Original "morning light" artwork for the dashboard hero: warm brand-coloured glows,
 * light rays from the top right, fine contour lines and a little grain. Drawn as SVG so
 * it is crisp at any size, weighs nothing and has a dark-mode variant.
 */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <defs>
        <filter id="hero-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
        <filter id="hero-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.5" />
          </feComponentTransfer>
        </filter>
        <linearGradient id="hero-ray" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hero-sun" cx="0.86" cy="0.08" r="0.5">
          <stop offset="0" stopColor="#fff7e6" stopOpacity="1" />
          <stop offset="1" stopColor="#fff7e6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Light: warm paper. Dark: deep plum night. */}
      <rect width="1200" height="400" className="fill-[#fbf6f1] dark:fill-[#1b1216]" />

      <g filter="url(#hero-soft)" className="opacity-95 dark:opacity-80">
        <ellipse cx="1030" cy="60" rx="300" ry="200" fill="#ffd38a" className="dark:opacity-25" />
        <ellipse cx="880" cy="270" rx="290" ry="160" fill="#fb6485" opacity="0.6" />
        <ellipse cx="1150" cy="340" rx="220" ry="150" fill="#ce1440" opacity="0.45" />
        <ellipse cx="660" cy="30" rx="240" ry="120" fill="#ffd9c2" className="dark:opacity-0" />
        <ellipse cx="600" cy="370" rx="260" ry="110" fill="#e9e0fa" opacity="0.9" className="dark:opacity-0" />
      </g>

      <rect width="1200" height="400" fill="url(#hero-sun)" className="opacity-80 dark:opacity-[0.06]" />

      {/* Rays of light from the top-right corner. */}
      <g className="opacity-45 dark:opacity-[0.08]">
        <polygon points="1200,0 1140,0 700,400 820,400" fill="url(#hero-ray)" />
        <polygon points="1200,0 1180,0 930,400 980,400" fill="url(#hero-ray)" />
        <polygon points="1200,40 1200,90 1080,400 1040,400" fill="url(#hero-ray)" />
      </g>

      {/* Fine contour lines, like ripples across a field. */}
      <g fill="none" strokeWidth="1" className="stroke-[#ad0e36]/[0.14] dark:stroke-[#fb6485]/[0.16]">
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={`M ${380 + i * 20} 400 C ${640 + i * 30} ${300 - i * 22}, ${900 + i * 18} ${250 - i * 26}, 1200 ${120 - i * 14}`}
          />
        ))}
      </g>

      <rect width="1200" height="400" filter="url(#hero-grain)" className="opacity-[0.07] mix-blend-multiply dark:opacity-[0.1] dark:mix-blend-screen" />
    </svg>
  )
}
