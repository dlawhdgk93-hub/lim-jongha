import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import type { ThemeColors } from '../constants/themes';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { DateTab } from '../utils/scheduleDates';

type Props = {
  tabs: DateTab[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onSwipeTab?: (direction: -1 | 1) => void;
};

const createStyles = (c: ThemeColors) => ({
  wrap: { marginBottom: 10 },
  scroll: { maxHeight: 36 },
  content: { gap: 6, paddingRight: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  tabActive: {
    borderColor: c.primary,
    backgroundColor: c.primary,
  },
  tabLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { color: c.textMuted, fontSize: 10, fontWeight: '700' },
  badgeTextActive: { color: '#fff' },
});

export function DateTabBar({ tabs, selectedKey, onSelect, onSwipeTab }: Props) {
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const tabOffsetsRef = useRef<Record<string, number>>({});

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_evt, gesture) => {
          if (!onSwipeTab) return;
          if (gesture.dx <= -48) onSwipeTab(1);
          else if (gesture.dx >= 48) onSwipeTab(-1);
        },
      }),
    [onSwipeTab],
  );

  useEffect(() => {
    const offset = tabOffsetsRef.current[selectedKey];
    if (offset == null) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, offset - 12), animated: true });
  }, [selectedKey, tabs]);

  if (tabs.length <= 1) return null;

  return (
    <View style={styles.wrap} {...swipeResponder.panHandlers}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {tabs.map((tab) => {
          const active = tab.key === selectedKey;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onSelect(tab.key)}
              onLayout={(event) => {
                tabOffsetsRef.current[tab.key] = event.nativeEvent.layout.x;
              }}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{tab.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
