export const PALETTE = {
  ink: 0x3b2314,
  cream: 0xfff4dc,
  tomato: 0xe4572e,
  tomatoDark: 0xb8401f,
  mustard: 0xf2a541,
  mustardDark: 0xc9822a,
  peach: 0xf7a072,
  sand: 0xf3d9a4,
  skyTop: 0xf28f5c,
  skyBottom: 0xfbe3b0,
  sun: 0xffd166,
  hillFar: 0xa9b85a,
  hillNear: 0x7f9d3d,
  grassLight: 0x9cc153,
  grassDark: 0x86ad45,
  surround: 0x6f8f35,
  track: 0xc98a4b,
  line: 0xfff6e2,
  net: 0xfff6e2,
  skin: 0xf2c29b,
  hair: 0x7a4a22,
  shadow: 0x3b2314,
  blue: 0x3d6fb6,
  blueDark: 0x284a7e,
  purple: 0x7d4e9f,
} as const;

export const CSS = {
  ink: '#3b2314',
  cream: '#fff4dc',
  tomato: '#e4572e',
  blue: '#3d6fb6',
  mustard: '#f2a541',
} as const;

export const FONT_FAMILY = '"Trebuchet MS", "Verdana", "Segoe UI", sans-serif';

export function textResolution(): number {
  return Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
}
