import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View } from 'react-native';

type Props = {
  tabKeys: string[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  disabled?: boolean;
  children: (tabKey: string) => ReactNode;
};

const SWIPE_COMMIT_RATIO = 0.28;
const EDGE_RUBBER_BAND = 0.32;

export function ScheduleTabSwipePager({
  tabKeys,
  selectedKey,
  onSelectKey,
  disabled = false,
  children,
}: Props) {
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStartX = useRef(0);
  const isAnimating = useRef(false);

  const selectedIndex = tabKeys.indexOf(selectedKey);
  const prevKey = selectedIndex > 0 ? tabKeys[selectedIndex - 1] : null;
  const nextKey =
    selectedIndex >= 0 && selectedIndex < tabKeys.length - 1
      ? tabKeys[selectedIndex + 1]
      : null;

  const snapToCenter = useCallback(
    (animated: boolean) => {
      if (width <= 0) return;
      const target = -width;
      if (animated) {
        isAnimating.current = true;
        Animated.spring(translateX, {
          toValue: target,
          useNativeDriver: true,
          tension: 72,
          friction: 13,
        }).start(() => {
          isAnimating.current = false;
        });
      } else {
        translateX.setValue(target);
      }
    },
    [translateX, width],
  );

  useEffect(() => {
    snapToCenter(false);
  }, [selectedKey, width, snapToCenter]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          !disabled &&
          !isAnimating.current &&
          width > 0 &&
          Math.abs(gesture.dx) > 14 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
        onPanResponderGrant: () => {
          translateX.stopAnimation((value) => {
            dragStartX.current = value;
          });
        },
        onPanResponderMove: (_evt, gesture) => {
          let next = dragStartX.current + gesture.dx;

          if (!prevKey && next > -width) {
            next = -width + (next + width) * EDGE_RUBBER_BAND;
          } else if (!nextKey && next < -width) {
            next = -width + (next + width) * EDGE_RUBBER_BAND;
          }

          translateX.setValue(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (width <= 0 || selectedIndex < 0) {
            snapToCenter(true);
            return;
          }

          const threshold = width * SWIPE_COMMIT_RATIO;
          let targetIndex = selectedIndex;

          if ((gesture.dx <= -threshold || gesture.vx <= -0.45) && nextKey) {
            targetIndex = selectedIndex + 1;
          } else if ((gesture.dx >= threshold || gesture.vx >= 0.45) && prevKey) {
            targetIndex = selectedIndex - 1;
          }

          if (targetIndex !== selectedIndex) {
            isAnimating.current = true;
            const toValue = targetIndex > selectedIndex ? -width * 2 : 0;
            Animated.timing(translateX, {
              toValue,
              duration: 240,
              useNativeDriver: true,
            }).start(() => {
              onSelectKey(tabKeys[targetIndex]);
              isAnimating.current = false;
            });
            return;
          }

          snapToCenter(true);
        },
        onPanResponderTerminate: () => {
          snapToCenter(true);
        },
      }),
    [
      disabled,
      nextKey,
      onSelectKey,
      prevKey,
      selectedIndex,
      snapToCenter,
      tabKeys,
      translateX,
      width,
    ],
  );

  if (selectedIndex < 0) {
    return <View style={{ flex: 1 }}>{children(selectedKey)}</View>;
  }

  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      {width > 0 ? (
        <Animated.View
          style={{
            flexDirection: 'row',
            width: width * 3,
            height: '100%',
            transform: [{ translateX }],
          }}
        >
          <View style={{ width, height: '100%' }}>{prevKey ? children(prevKey) : null}</View>
          <View style={{ width, height: '100%' }}>{children(selectedKey)}</View>
          <View style={{ width, height: '100%' }}>{nextKey ? children(nextKey) : null}</View>
        </Animated.View>
      ) : null}
    </View>
  );
}
