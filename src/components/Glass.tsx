import { Button, Host } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  font,
  frame,
  labelStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type Symbol = NonNullable<ComponentProps<typeof Button>['systemImage']>;

const tap = () => Haptics.selectionAsync().catch(() => {});

/** Round Liquid Glass button with an SF Symbol. */
export function GlassIconButton({
  icon,
  label,
  onPress,
  prominent,
  color,
  size = 'large',
  style,
}: {
  icon: Symbol;
  label: string;
  onPress: () => void;
  prominent?: boolean;
  color?: string;
  size?: 'regular' | 'large' | 'extraLarge';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Host matchContents style={style}>
      <Button
        label={label}
        systemImage={icon}
        onPress={() => {
          tap();
          onPress();
        }}
        modifiers={[
          labelStyle('iconOnly'),
          buttonStyle(prominent ? 'glassProminent' : 'glass'),
          buttonBorderShape('circle'),
          controlSize(size),
          ...(color ? [tint(color)] : []),
        ]}
      />
    </Host>
  );
}

/** Capsule Liquid Glass button with icon and text. */
export function GlassPill({
  icon,
  label,
  onPress,
  prominent,
  color,
  style,
}: {
  icon: Symbol;
  label: string;
  onPress: () => void;
  prominent?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Host matchContents style={style}>
      <Button
        label={label}
        systemImage={icon}
        onPress={() => {
          tap();
          onPress();
        }}
        modifiers={[
          buttonStyle(prominent ? 'glassProminent' : 'glass'),
          buttonBorderShape('capsule'),
          controlSize('extraLarge'),
          font({ size: 17, weight: 'semibold' }),
          frame({ minWidth: 120 }),
          ...(color ? [tint(color)] : []),
        ]}
      />
    </Host>
  );
}
