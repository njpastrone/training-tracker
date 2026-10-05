import Svg, { Path } from 'react-native-svg';

// The LiftText mark: the app icon's sent bubble with the barbell cut out, as a one-colour glyph that
// tints like an SF Symbol. Replace this one path (and the tab images rendered from
// assets/source/logo-glyph.svg into assets/tab-logo*.png) to change the AI mark everywhere.
export default function LogoMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="119 117 790 790" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M302 250 H698 A138 138 0 0 1 836 388 L836 540 Q836 596 844.7 651.3 L862 761.2 Q864 774 852.1 768.8 L722.9 712.1 Q668 688 608 688 H302 A138 138 0 0 1 164 550 V388 A138 138 0 0 1 302 250 Z M258 373 A30 30 0 0 1 288 343 H308 A30 30 0 0 1 338 373 V384 H370 A22 22 0 0 1 392 406 V443 H608 V406 A22 22 0 0 1 630 384 H662 V373 A30 30 0 0 1 692 343 H712 A30 30 0 0 1 742 373 V565 A30 30 0 0 1 712 595 H692 A30 30 0 0 1 662 565 V554 H630 A22 22 0 0 1 608 532 V495 H392 V532 A22 22 0 0 1 370 554 H338 V565 A30 30 0 0 1 308 595 H288 A30 30 0 0 1 258 565 Z" fill={color} fillRule="evenodd" />
    </Svg>
  );
}
