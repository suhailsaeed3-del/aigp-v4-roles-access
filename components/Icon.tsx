import React from 'react';

// Renders an inline SVG stroke icon from a path `d` string (the prototype
// stores icon geometry as raw SVG path data). Defaults match the prototype's
// stroke styling.
export function Icon({
  d,
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  fill = 'none',
  style,
}: {
  d: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
