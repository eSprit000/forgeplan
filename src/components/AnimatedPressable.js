/**
 * AnimatedPressable
 * Drop-in replacement for TouchableOpacity with:
 *   - Spring scale-down on press via Reanimated
 *   - Optional haptic feedback (expo-haptics)
 *   - No visible ripple / opacity flash — purely scale-based
 *
 * Usage:
 *   <AnimatedPressable onPress={...} style={styles.card}>
 *     <Text>...</Text>
 *   </AnimatedPressable>
 */
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { TIMING } from '../constants/theme';

export default function AnimatedPressable({
  children,
  style,
  onPress,
  onLongPress,
  /** 'light' | 'medium' | 'heavy' | null */
  haptic = 'light',
  /** Scale target while pressed, e.g. 0.97 */
  scale = 0.97,
  disabled = false,
  ...pressableProps
}) {
  const pressed = useSharedValue(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(
          pressed.value && !disabled ? scale : 1,
          TIMING.springSnappy,
        ),
      },
    ],
  }));

  const triggerHaptic = () => {
    if (!haptic || disabled) return;
    const style =
      haptic === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : haptic === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(style).catch(() => {});
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={[style, disabled && { opacity: 0.5 }]}
        onPressIn={() => { pressed.value = true; }}
        onPressOut={() => { pressed.value = false; }}
        onPress={() => {
          triggerHaptic();
          onPress?.();
        }}
        onLongPress={onLongPress}
        disabled={disabled}
        {...pressableProps}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
