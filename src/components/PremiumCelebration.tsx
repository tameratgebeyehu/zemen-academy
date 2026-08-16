import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { useApp } from '@/context/AppContext';
import { V1_PAST_PAPERS_ENABLED } from '@/config';
import { ui } from '@/data/theme';

const GOLD = '#E1B84B';
const GOLD_DARK = '#17130A';
const particles = [
  { left: '8%', top: 42, icon: 'star-four-points', size: 17 },
  { left: '20%', top: 12, icon: 'circle-small', size: 22 },
  { left: '34%', top: 32, icon: 'star', size: 14 },
  { right: '33%', top: 18, icon: 'circle-small', size: 24 },
  { right: '19%', top: 38, icon: 'star-four-points', size: 16 },
  { right: '7%', top: 8, icon: 'star', size: 13 },
] as const;

export function PremiumCelebration() {
  const { premiumCelebration, dismissPremiumCelebration } = useApp();
  const theme = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!premiumCelebration) {
      entrance.setValue(0);
      sparkle.setValue(0);
      return;
    }
    const animation = Animated.parallel([
      Animated.spring(entrance, {
        toValue: 1,
        speed: 14,
        bounciness: 7,
        useNativeDriver: true,
      }),
      Animated.timing(sparkle, {
        toValue: 1,
        duration: 950,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [entrance, premiumCelebration, sparkle]);

  const expiration = premiumCelebration?.until
    ? new Date(premiumCelebration.until).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <Portal>
      <Modal
        visible={Boolean(premiumCelebration)}
        dismissable={false}
        contentContainerStyle={styles.modalWrap}
      >
        <Animated.View style={{
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
            { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        }}>
          <Card mode="elevated" style={[styles.card, { borderColor: GOLD }]}>
            <Card.Content style={styles.content}>
              <View style={styles.celebrationStage}>
                {particles.map((particle, index) => (
                  <Animated.View
                    key={`${particle.icon}-${index}`}
                    style={[
                      styles.particle,
                      {
                        left: 'left' in particle ? particle.left : undefined,
                        right: 'right' in particle ? particle.right : undefined,
                        top: particle.top,
                      },
                      {
                        opacity: sparkle.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0.72] }),
                        transform: [
                          { translateY: sparkle.interpolate({ inputRange: [0, 1], outputRange: [18, -8 - index * 2] }) },
                          { rotate: `${index % 2 ? 18 : -18}deg` },
                        ],
                      },
                    ]}
                  >
                    <Icon source={particle.icon} size={particle.size} color={GOLD} />
                  </Animated.View>
                ))}
                <Animated.View style={[
                  styles.crown,
                  {
                    transform: [{ scale: entrance.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.55, 1.12, 1] }) }],
                  },
                ]}>
                  <Icon source="crown" size={46} color={GOLD_DARK} />
                </Animated.View>
              </View>

              <Text variant="headlineMedium" style={styles.title}>Premium activated!</Text>
              <Text variant="bodyLarge" style={styles.body}>
                Congratulations — {premiumCelebration?.planName ?? 'Zemen Premium'} is now active. Every published subject, quiz, explanation, study note, and offline download for your plan is unlocked{V1_PAST_PAPERS_ENABLED ? ', including entrance papers' : ''}.
              </Text>
              {expiration ? (
                <View style={[styles.expiry, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Icon source="calendar-check-outline" size={19} color={theme.colors.primary} />
                  <Text variant="labelLarge">Active until {expiration}</Text>
                </View>
              ) : null}
              <Button
                mode="contained"
                icon="creation"
                buttonColor={GOLD}
                textColor={GOLD_DARK}
                contentStyle={styles.button}
                onPress={dismissPremiumCelebration}
              >
                Start learning
              </Button>
            </Card.Content>
          </Card>
        </Animated.View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalWrap: { width: '100%', maxWidth: 520, paddingHorizontal: 20, alignSelf: 'center' },
  card: { borderRadius: ui.radius.lg, borderWidth: 1.5, overflow: 'hidden', backgroundColor: GOLD_DARK },
  content: { alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 28 },
  celebrationStage: { width: '100%', height: 112, alignItems: 'center', justifyContent: 'flex-end' },
  crown: { width: 82, height: 82, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: GOLD },
  particle: { position: 'absolute' },
  title: { color: '#FFF8E4', fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  body: { color: '#D8CEB6', textAlign: 'center', lineHeight: 24 },
  expiry: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { minHeight: 50, paddingHorizontal: 18 },
});
