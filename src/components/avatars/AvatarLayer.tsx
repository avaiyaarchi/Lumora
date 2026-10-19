import React, { useEffect, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G, Rect, Ellipse } from 'react-native-svg';
import { useThemeStore } from '../../store/themeStore';

export type AvatarType = 'cat' | 'rabbit' | 'fox' | 'panda' | 'penguin' | 'sloth';
export type AccessoryType = 'books' | 'headphones' | 'coffee' | 'scarf' | 'flower' | 'glasses';

interface AvatarLayerProps {
  avatar: AvatarType;
  accessories?: AccessoryType[];
  size?: number;
  animated?: boolean;
}

export const AvatarLayer: React.FC<AvatarLayerProps> = ({
  avatar,
  accessories = [],
  size = 150,
  animated = true,
}) => {
  const colors = useThemeStore((state) => state.getColors());
  const [bobAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (animated) {
      const bobSequence = Animated.loop(
        Animated.sequence([
          Animated.timing(bobAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bobAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      bobSequence.start();
      return () => bobSequence.stop();
    } else {
      bobAnim.setValue(0);
    }
  }, [animated, bobAnim]);

  const translateY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6], // gentle bobbing
  });

  const scaleY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02], // slight squish effect
  });

  // SVG components for accessories
  const renderAccessories = () => {
    return (
      <>
        {/* SCARF (drawn under face elements, over body) */}
        {accessories.includes('scarf') && (
          <G id="accessory-scarf">
            {/* Main neck band */}
            <Path
              d="M70 123 C75 120, 125 120, 130 123 C135 128, 132 135, 125 136 C115 137, 85 137, 75 136 C68 135, 65 128, 70 123 Z"
              fill={colors.primary}
            />
            {/* Hanging scarf tail */}
            <Path
              d="M110 132 C112 140, 115 155, 110 165 C108 168, 118 168, 120 162 C123 152, 122 138, 120 132 Z"
              fill={colors.primary}
              opacity={0.9}
            />
            {/* Fringe stripes */}
            <Rect x="110" y="160" width="3" height="5" fill="#FFFFFF" opacity={0.6} />
            <Rect x="114" y="162" width="3" height="5" fill="#FFFFFF" opacity={0.6} />
            <Rect x="118" y="160" width="3" height="5" fill="#FFFFFF" opacity={0.6} />
          </G>
        )}

        {/* HEADPHONES */}
        {accessories.includes('headphones') && (
          <G id="accessory-headphones">
            {/* Headband arc */}
            <Path
              d="M 55 90 A 45 45 0 0 1 145 90"
              fill="none"
              stroke="#4A4A4A"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Left ear cup */}
            <Rect
              x="45"
              y="78"
              width="14"
              height="26"
              rx="7"
              fill={colors.primary}
              stroke="#333333"
              strokeWidth="2"
            />
            {/* Right ear cup */}
            <Rect
              x="141"
              y="78"
              width="14"
              height="26"
              rx="7"
              fill={colors.primary}
              stroke="#333333"
              strokeWidth="2"
            />
            {/* Inner cushions */}
            <Rect x="55" y="83" width="4" height="16" rx="2" fill="#E0E0E0" />
            <Rect x="141" y="83" width="4" height="16" rx="2" fill="#E0E0E0" />
          </G>
        )}

        {/* GLASSES */}
        {accessories.includes('glasses') && (
          <G id="accessory-glasses">
            {/* Left frame */}
            <Circle cx="82" cy="92" r="15" fill="none" stroke="#222" strokeWidth="3" />
            {/* Right frame */}
            <Circle cx="118" cy="92" r="15" fill="none" stroke="#222" strokeWidth="3" />
            {/* Bridge */}
            <Path d="M 97 92 Q 100 88 103 92" fill="none" stroke="#222" strokeWidth="3" />
            {/* Temples */}
            <Path d="M 67 92 Q 57 88 52 92" fill="none" stroke="#222" strokeWidth="2" />
            {/* Right temple */}
            <Path d="M 133 92 Q 143 88 148 92" fill="none" stroke="#222" strokeWidth="2" />
          </G>
        )}

        {/* FLOWER */}
        {accessories.includes('flower') && (
          <G id="accessory-flower" transform="translate(125, 62)">
            {/* Petals */}
            <Circle cx="-8" cy="0" r="6" fill="#FFC0CB" />
            <Circle cx="8" cy="0" r="6" fill="#FFC0CB" />
            <Circle cx="0" cy="-8" r="6" fill="#FFC0CB" />
            <Circle cx="0" cy="8" r="6" fill="#FFC0CB" />
            {/* Center */}
            <Circle cx="0" cy="0" r="4.5" fill="#FFE082" />
          </G>
        )}

        {/* COFFEE CUP */}
        {accessories.includes('coffee') && (
          <G id="accessory-coffee" transform="translate(128, 130)">
            {/* Steam */}
            <Path d="M-8 -25 Q-12 -33 -8 -40" fill="none" stroke="#A68A78" strokeWidth="2" />
            <Path d="M-2 -23 Q-6 -30 -2 -37" fill="none" stroke="#A68A78" strokeWidth="2" />
            {/* Cup Body */}
            <Path
              d="M-15 -20 L-11 5 C-10 10, 0 10, 1 5 L5 -20 Z"
              fill={colors.secondary}
              stroke={colors.primary}
              strokeWidth="2.5"
            />
            {/* Sleeve */}
            <Path d="M-14 -12 L-12 0 L2 0 L4 -12 Z" fill="#D7CCC8" />
            {/* Handle */}
            <Path
              d="M 4 -15 Q 12 -15 12 -7 Q 12 0 2 0"
              fill="none"
              stroke={colors.primary}
              strokeWidth="2.5"
            />
          </G>
        )}

        {/* BOOKS */}
        {accessories.includes('books') && (
          <G id="accessory-books" transform="translate(38, 135)">
            {/* Bottom Book */}
            <Rect x="-15" y="10" width="36" height="12" rx="3" fill="#81C784" />
            <Rect x="13" y="12" width="6" height="8" fill="#FFFFFF" />
            {/* Top Book */}
            <Rect x="-10" y="2" width="30" height="10" rx="3" fill="#64B5F6" transform="rotate(-6)" />
            <Rect x="12" y="3" width="6" height="7" fill="#FFFFFF" transform="rotate(-6)" />
          </G>
        )}
      </>
    );
  };

  const renderAnimal = () => {
    switch (avatar) {
      case 'cat':
        return (
          <G id="animal-cat">
            {/* Tail */}
            <Path
              d="M 130 150 Q 165 150 160 120 Q 155 100 145 105"
              fill="none"
              stroke="#D3CBE3"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Body */}
            <Circle cx="100" cy="142" r="44" fill="#E6E1F2" />
            {/* Ears */}
            <Path d="M 68 85 L 50 48 L 84 62 Z" fill="#D3CBE3" />
            <Path d="M 132 85 L 150 48 L 116 62 Z" fill="#D3CBE3" />
            {/* Inner Ears */}
            <Path d="M 69 77 L 57 54 L 79 64 Z" fill="#FFA7A7" />
            <Path d="M 131 77 L 143 54 L 121 64 Z" fill="#FFA7A7" />
            {/* Head */}
            <Ellipse cx="100" cy="90" rx="42" ry="36" fill="#E6E1F2" />
            {/* Eyes */}
            <Circle cx="84" cy="86" r="4" fill="#2C2540" />
            <Circle cx="116" cy="86" r="4" fill="#2C2540" />
            <Circle cx="83" cy="84" r="1.2" fill="#FFFFFF" />
            <Circle cx="115" cy="84" r="1.2" fill="#FFFFFF" />
            {/* Cheeks */}
            <Circle cx="73" cy="95" r="5" fill="#FFC0CB" opacity={0.6} />
            <Circle cx="127" cy="95" r="5" fill="#FFC0CB" opacity={0.6} />
            {/* Whiskers */}
            <Path d="M 52 90 L 38 88 M 52 94 L 35 95" stroke="#7A728E" strokeWidth="1.5" />
            <Path d="M 148 90 L 162 88 M 148 94 L 165 95" stroke="#7A728E" strokeWidth="1.5" />
            {/* Nose & Mouth */}
            <Path d="M 97 92 L 103 92 L 100 95 Z" fill="#FFA7A7" />
            <Path d="M 96 98 Q 100 102 104 98" fill="none" stroke="#7A728E" strokeWidth="1.5" strokeLinecap="round" />
          </G>
        );
      case 'rabbit':
        return (
          <G id="animal-rabbit">
            {/* Tail */}
            <Circle cx="60" cy="165" r="12" fill="#FFFFFF" />
            {/* Body */}
            <Circle cx="100" cy="144" r="42" fill="#FFFFFF" />
            {/* Ears */}
            <Path d="M 72 65 C 62 10, 85 10, 85 60 Z" fill="#FFFFFF" />
            <Path d="M 128 65 C 138 10, 115 10, 115 60 Z" fill="#FFFFFF" />
            {/* Inner Ears */}
            <Path d="M 73 58 C 67 22, 80 22, 81 55 Z" fill="#FFA7A7" />
            <Path d="M 127 58 C 133 22, 120 22, 119 55 Z" fill="#FFA7A7" />
            {/* Head */}
            <Circle cx="100" cy="95" r="36" fill="#FFFFFF" />
            {/* Eyes */}
            <Circle cx="86" cy="92" r="3.5" fill="#3E2718" />
            <Circle cx="114" cy="92" r="3.5" fill="#3E2718" />
            {/* Cheeks */}
            <Circle cx="76" cy="100" r="5" fill="#FFC0CB" opacity={0.7} />
            <Circle cx="124" cy="100" r="5" fill="#FFC0CB" opacity={0.7} />
            {/* Nose & Mouth */}
            <Path d="M 98 96 L 102 96 L 100 98 Z" fill="#FF8A8A" />
            <Path d="M 96 101 Q 100 104 104 101" fill="none" stroke="#846D5E" strokeWidth="1.5" strokeLinecap="round" />
            {/* Teeth */}
            <Rect x="98.5" y="103" width="3" height="3" fill="#FFFFFF" stroke="#846D5E" strokeWidth="0.8" />
          </G>
        );
      case 'fox':
        return (
          <G id="animal-fox">
            {/* Tail */}
            <Path
              d="M 130 152 Q 170 162 165 130 C 160 110, 140 100, 134 135"
              fill="#E05B2B"
            />
            <Path d="M 160 120 C 165 110, 155 100, 150 112 Z" fill="#FFFFFF" />
            {/* Body */}
            <Circle cx="100" cy="144" r="44" fill="#FF7D4D" />
            <Ellipse cx="100" cy="154" rx="20" ry="24" fill="#FFFFFF" />
            {/* Ears */}
            <Path d="M 66 82 L 44 42 L 82 62 Z" fill="#FF7D4D" />
            <Path d="M 134 82 L 156 42 L 118 62 Z" fill="#FF7D4D" />
            <Path d="M 68 76 L 52 49 L 79 62 Z" fill="#42352B" />
            <Path d="M 132 76 L 148 49 L 121 62 Z" fill="#42352B" />
            {/* Head */}
            <Path
              d="M 60 92 C 60 72, 140 72, 140 92 C 140 115, 115 120, 100 120 C 85 120, 60 115, 60 92 Z"
              fill="#FF7D4D"
            />
            {/* White face cheeks patches */}
            <Path d="M 61 95 C 61 106, 85 118, 92 110 C 88 100, 72 90, 61 95 Z" fill="#FFFFFF" />
            <Path d="M 139 95 C 139 106, 115 118, 108 110 C 112 100, 128 90, 139 95 Z" fill="#FFFFFF" />
            {/* Eyes */}
            <Path d="M 76 89 Q 82 85 88 89" fill="none" stroke="#222" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M 112 89 Q 118 85 124 89" fill="none" stroke="#222" strokeWidth="2.5" strokeLinecap="round" />
            {/* Nose */}
            <Circle cx="100" cy="112" r="3.5" fill="#222" />
          </G>
        );
      case 'panda':
        return (
          <G id="animal-panda">
            {/* Body */}
            <Circle cx="100" cy="144" r="44" fill="#FFFFFF" />
            {/* Black shoulder strap/arms */}
            <Path
              d="M 54 130 C 50 148, 65 170, 72 170 C 82 170, 75 140, 100 140 C 125 140, 118 170, 128 170 C 135 170, 150 148, 146 130 Z"
              fill="#2F2F2F"
            />
            {/* Ears */}
            <Circle cx="66" cy="62" r="14" fill="#2F2F2F" />
            <Circle cx="134" cy="62" r="14" fill="#2F2F2F" />
            <Circle cx="66" cy="62" r="8" fill="#FFC0CB" opacity={0.4} />
            <Circle cx="134" cy="62" r="8" fill="#FFC0CB" opacity={0.4} />
            {/* Head */}
            <Ellipse cx="100" cy="94" rx="42" ry="36" fill="#FFFFFF" stroke="#ECEFF1" strokeWidth="1" />
            {/* Eyes Patches */}
            <Ellipse cx="82" cy="94" rx="10" ry="14" fill="#2F2F2F" transform="rotate(-15, 82, 94)" />
            <Ellipse cx="118" cy="94" rx="10" ry="14" fill="#2F2F2F" transform="rotate(15, 118, 94)" />
            {/* White Eyes Inside */}
            <Circle cx="84" cy="92" r="3.5" fill="#FFFFFF" />
            <Circle cx="116" cy="92" r="3.5" fill="#FFFFFF" />
            <Circle cx="85" cy="91" r="1.2" fill="#2F2F2F" />
            <Circle cx="115" cy="91" r="1.2" fill="#2F2F2F" />
            {/* Nose & Mouth */}
            <Ellipse cx="100" cy="103" rx="4" ry="2.5" fill="#2F2F2F" />
            <Path d="M 97 108 Q 100 111 103 108" fill="none" stroke="#2F2F2F" strokeWidth="1.5" strokeLinecap="round" />
            {/* Cheeks */}
            <Circle cx="67" cy="102" r="4" fill="#FFC0CB" opacity={0.6} />
            <Circle cx="133" cy="102" r="4" fill="#FFC0CB" opacity={0.6} />
          </G>
        );
      case 'penguin':
        return (
          <G id="animal-penguin">
            {/* Feet */}
            <Ellipse cx="80" cy="178" rx="14" ry="6" fill="#FFA726" />
            <Ellipse cx="120" cy="178" rx="14" ry="6" fill="#FFA726" />
            {/* Body */}
            <Circle cx="100" cy="136" r="46" fill="#263238" />
            {/* Flippers */}
            <Path
              d="M 54 130 C 35 130, 42 160, 48 160 C 58 160, 56 142, 56 130"
              fill="#263238"
            />
            <Path
              d="M 146 130 C 165 130, 158 160, 152 160 C 142 160, 144 142, 144 130"
              fill="#263238"
            />
            {/* White Tummy */}
            <Ellipse cx="100" cy="144" rx="30" ry="28" fill="#FFFFFF" />
            {/* Head */}
            <Circle cx="100" cy="88" r="38" fill="#263238" />
            {/* White Face Mask */}
            <Path
              d="M 72 88 C 72 74, 100 70, 100 86 C 100 70, 128 74, 128 88 C 128 102, 72 102, 72 88 Z"
              fill="#FFFFFF"
            />
            {/* Eyes */}
            <Circle cx="86" cy="85" r="3" fill="#263238" />
            <Circle cx="114" cy="85" r="3" fill="#263238" />
            {/* Beak */}
            <Path d="M 94 92 L 106 92 L 100 102 Z" fill="#FFA726" />
            {/* Cheeks */}
            <Circle cx="76" cy="94" r="3" fill="#FFC0CB" opacity={0.8} />
            <Circle cx="124" cy="94" r="3" fill="#FFC0CB" opacity={0.8} />
          </G>
        );
      case 'sloth':
        return (
          <G id="animal-sloth">
            {/* Body */}
            <Circle cx="100" cy="144" r="44" fill="#B0BEC5" />
            <Ellipse cx="100" cy="150" rx="26" ry="20" fill="#ECEFF1" />
            {/* Head */}
            <Ellipse cx="100" cy="96" rx="40" ry="34" fill="#ECEFF1" />
            {/* Dark Eye Bands */}
            <Path
              d="M 66 94 C 66 84, 82 86, 82 96 C 82 104, 68 104, 66 94 Z"
              fill="#90A4AE"
              transform="rotate(-10, 74, 95)"
            />
            <Path
              d="M 134 94 C 134 84, 118 86, 118 96 C 118 104, 132 104, 134 94 Z"
              fill="#90A4AE"
              transform="rotate(10, 126, 95)"
            />
            {/* Eyes */}
            <Circle cx="76" cy="94" r="2.5" fill="#37474F" />
            <Circle cx="124" cy="94" r="2.5" fill="#37474F" />
            {/* Nose & Mouth */}
            <Rect x="96" y="98" width="8" height="5" rx="2" fill="#546E7A" />
            <Path d="M 94 108 Q 100 111 106 108" fill="none" stroke="#546E7A" strokeWidth="1.5" strokeLinecap="round" />
            {/* Cheeks */}
            <Circle cx="63" cy="100" r="4" fill="#FFC0CB" opacity={0.5} />
            <Circle cx="137" cy="100" r="4" fill="#FFC0CB" opacity={0.5} />
          </G>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [
            { translateY: translateY },
            { scaleY: scaleY },
          ],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          {renderAnimal()}
          {renderAccessories()}
        </Svg>
      </Animated.View>
    </View>
  );
};
