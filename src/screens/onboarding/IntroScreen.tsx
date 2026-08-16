import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type ViewToken } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark, StepProgress } from '@/components/FirstRun';
import { Reveal } from '@/components/Motion';
import { useApp } from '@/context/AppContext';
import { introSlides } from '@/data/catalog';
import { subjectPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Intro'>;

const slideDetails = [
  { eyebrow: 'PRACTICE SMARTER', stat: 'Short sessions', supporting: 'Build a daily habit without feeling overwhelmed.' },
  { eyebrow: 'LEARN ANYWHERE', stat: 'Zero data needed', supporting: 'Keep downloaded lessons and quizzes available on your phone.' },
  { eyebrow: 'EXAM READY', stat: 'Two quiz modes', supporting: 'Learn with feedback, then test yourself under exam conditions.' },
  { eyebrow: 'MADE FOR YOU', stat: 'Day or night', supporting: 'Choose the language and appearance that feel comfortable.' },
  { eyebrow: 'START YOUR WAY', stat: 'Guest or account', supporting: 'Try it instantly, then sync progress whenever you are ready.' },
] as const;

export function IntroScreen({}: Props) {
  const { markIntroSeen } = useApp();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const slideWidth = width - 40;
  const list = useRef<FlatList<(typeof introSlides)[number]>>(null);
  const [index, setIndex] = useState(0);
  const finalSlide = index === introSlides.length - 1;

  const next = () => {
    if (finalSlide) markIntroSeen();
    else list.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems[0]?.index;
    if (visible !== null && visible !== undefined) setIndex(visible);
  }).current;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <BrandMark compact />
        <Button compact onPress={markIntroSeen} labelStyle={styles.skip}>Skip</Button>
      </View>

      <FlatList
        ref={list}
        data={introSlides}
        keyExtractor={(item) => item.title}
        horizontal
        snapToInterval={slideWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slideList}
        getItemLayout={(_data, itemIndex) => ({ length: slideWidth, offset: slideWidth * itemIndex, index: itemIndex })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index: slideIndex }) => {
          const detail = slideDetails[slideIndex] ?? slideDetails[0];
          const tone = subjectPalette(item.title, theme.dark);
          return (
            <Reveal style={[styles.slide, { width: slideWidth }]} delay={80}>
              <View style={[styles.visualCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: tone.soft, borderColor: tone.container }]}>
                <Text variant="labelMedium" style={[styles.slideNumber, { color: tone.color }]}>
                  0{slideIndex + 1}
                </Text>
                <View style={[styles.iconHalo, { backgroundColor: tone.container }]}>
                  <View style={[styles.iconCore, { backgroundColor: tone.soft }]}>
                    <Icon source={item.icon} size={52} color={tone.color} />
                  </View>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                  <Icon source="check-decagram" size={20} color={theme.colors.secondary} />
                  <View style={styles.grow}>
                    <Text variant="labelSmall" style={styles.eyebrow}>{detail.eyebrow}</Text>
                    <Text variant="titleMedium" style={styles.stat}>{detail.stat}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.copy}>
                <Text variant="headlineMedium" style={styles.title}>{item.title}</Text>
                <Text variant="bodyLarge" style={styles.body}>{item.body}</Text>
                <Text variant="bodyMedium" style={styles.supporting}>{detail.supporting}</Text>
              </View>
            </Reveal>
          );
        }}
      />

      <View style={styles.footer}>
        <StepProgress current={index + 1} total={introSlides.length} label={`Discover ${index + 1} of ${introSlides.length}`} />
        <Button
          mode="contained"
          icon={finalSlide ? 'check' : 'arrow-right'}
          contentStyle={styles.button}
          labelStyle={styles.buttonLabel}
          onPress={next}
        >
          {finalSlide ? 'Choose how to begin' : 'Continue'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  topBar: { minHeight: 62, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { fontWeight: '700' },
  slideList: { alignItems: 'stretch' },
  slide: { justifyContent: 'center', alignItems: 'stretch', paddingHorizontal: 4, gap: 30 },
  visualCard: {
    minHeight: 285,
    borderRadius: ui.radius.xl,
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
  },
  slideNumber: { position: 'absolute', left: 22, top: 18, fontWeight: '900', letterSpacing: 1.2 },
  iconHalo: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center' },
  iconCore: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  statCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    minHeight: 64,
    borderRadius: ui.radius.md,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  grow: { flex: 1 },
  eyebrow: { opacity: 0.58, fontWeight: '800', letterSpacing: 0.7 },
  stat: { fontWeight: '900' },
  copy: { gap: 10 },
  title: { fontWeight: '900', letterSpacing: -0.7 },
  body: { opacity: 0.74, lineHeight: 25 },
  supporting: { opacity: 0.55, lineHeight: 21 },
  footer: { gap: 18, paddingTop: 8, paddingBottom: 10 },
  button: { minHeight: 54, flexDirection: 'row-reverse' },
  buttonLabel: { fontWeight: '800', fontSize: 15 },
});
