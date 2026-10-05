import Svg, { Path, Rect } from 'react-native-svg';

// The LiftText mark: the app icon's speech bubble with a barbell, as a one-colour glyph that tints
// like an SF Symbol. Source: assets/source/logo-glyph.svg (tab bar PNGs: assets/tab-logo*.png).
export default function LogoMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="82 112 860 860" accessibilityElementsHidden importantForAccessibility="no">
      <Path
        d="M240 266 h544 a124 124 0 0 1 124 124 v190 a124 124 0 0 1 -124 124 h-300 l-132 112 a12 12 0 0 1 -20 -9 v-103 h-92 a124 124 0 0 1 -124 -124 v-190 a124 124 0 0 1 124 -124z"
        fill="none"
        stroke={color}
        strokeWidth={72}
        strokeLinejoin="round"
      />
      <Rect x={300} y={457} width={424} height={50} rx={20} fill={color} />
      <Rect x={314} y={368} width={76} height={228} rx={30} fill={color} />
      <Rect x={398} y={404} width={52} height={156} rx={22} fill={color} />
      <Rect x={634} y={368} width={76} height={228} rx={30} fill={color} />
      <Rect x={574} y={404} width={52} height={156} rx={22} fill={color} />
    </Svg>
  );
}
