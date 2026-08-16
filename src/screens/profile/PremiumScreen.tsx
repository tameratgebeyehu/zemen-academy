import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Checkbox, Chip, Divider, Icon, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

import { useAppDialog } from '@/components/AppDialog';
import { PressableScale, Reveal } from '@/components/Motion';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen } from '@/components/Screen';
import { CONTACTS, MANUAL_PREMIUM_PAYMENTS_ENABLED, V1_PAST_PAPERS_ENABLED } from '@/config';
import { useApp } from '@/context/AppContext';
import { ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { PremiumPaymentMethod, PremiumPlan, PremiumRequest } from '@/types';
import { premiumDaysRemaining } from '@/utils/premium';
import { canStartPremiumPurchase, formatPremiumRequestDate, premiumRequestIsOpen, premiumRequestValidationError } from '@/utils/premiumRequest';
import { userFacingError } from '@/utils/userFacingError';

type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;
type FlowStep = 1 | 2;

const GOLD = '#E1B84B';
const GOLD_DARK = '#17130A';
const GOLD_BORDER = '#B98716';
const GOLD_TEXT = '#6A4700';

const PREMIUM_BENEFITS = [
  { icon: 'bookshelf', title: 'Every available subject and unit', body: 'Open the complete published catalog for your grade and stream.' },
  { icon: 'clipboard-check-outline', title: 'Unlimited quizzes and explanations', body: 'Practice in Instant mode or prepare under Exam mode rules.' },
  { icon: 'notebook-outline', title: 'Complete study notes', body: 'Read structured unit notes and save them for focused offline revision.' },
  ...(V1_PAST_PAPERS_ENABLED ? [
    { icon: 'file-document-multiple-outline', title: 'Entrance exam archive', body: 'Practise and download published Ethiopian entrance-exam papers.' },
  ] : []),
  { icon: 'download-circle-outline', title: 'Offline quizzes and notes', body: 'Keep published learning material available without mobile data.' },
  { icon: 'calendar-clock-outline', title: 'Study timetable and reminders', body: 'Build a weekly study rhythm and receive reminders at the times you choose.' },
  { icon: 'chart-line', title: 'Answer review and progress', body: 'Review explanations and track completed quizzes, scores, streaks, and study time.' },
  { icon: 'lock-reset', title: 'Premium account recovery', body: 'Use secure email password recovery when you need it.' },
];

export function PremiumScreen({}: Props) {
  const {
    state,
    premiumPlans,
    premiumPaymentMethods,
    premiumRequest,
    refreshPremium,
    submitPremiumRequest,
    cancelPremiumRequest,
    startAuthentication,
  } = useApp();
  const { showDialog } = useAppDialog();
  const theme = useTheme();
  const [step, setStep] = useState<FlowStep>(1);
  const [planId, setPlanId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [loading, setLoading] = useState(!premiumPlans.length);
  const [banksLoading, setBanksLoading] = useState(!premiumPaymentMethods.length);
  const [message, setMessage] = useState('');
  const wasPremium = useRef(Boolean(state.user?.isPremium));
  const hasOpenRequest = premiumRequestIsOpen(premiumRequest?.status);

  useEffect(() => {
    let active = true;
    void refreshPremium()
      .catch((caught) => { if (active) setMessage(userFacingError(caught, 'premium')); })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setBanksLoading(false);
      });
    return () => { active = false; };
  }, [refreshPremium]);

  useEffect(() => {
    if (!hasOpenRequest) return undefined;
    const timer = setInterval(() => void refreshPremium().catch(() => undefined), 30_000);
    return () => clearInterval(timer);
  }, [hasOpenRequest, refreshPremium]);

  useEffect(() => {
    if (!planId && premiumPlans.length) {
      setPlanId((premiumPlans.find((plan) => plan.id === 'premium-90') ?? premiumPlans[0])?.id ?? '');
    }
  }, [planId, premiumPlans]);

  useEffect(() => {
    if (!paymentMethodId && premiumPaymentMethods.length) {
      setPaymentMethodId(premiumPaymentMethods[0]?.id ?? '');
    }
  }, [paymentMethodId, premiumPaymentMethods]);

  useEffect(() => {
    if (!wasPremium.current && state.user?.isPremium) {
      setStep(1);
      setMessage('Welcome to Zemen Premium! Your complete learning library is now open.');
    }
    wasPremium.current = Boolean(state.user?.isPremium);
  }, [state.user?.isPremium]);

  const selectedPlan = premiumPlans.find((plan) => plan.id === planId);
  const selectedMethod = premiumPaymentMethods.find((method) => method.id === paymentMethodId);
  const currentPlan = useMemo(
    () => premiumPlans.find((plan) => plan.id === state.user?.premiumPlanId),
    [premiumPlans, state.user?.premiumPlanId],
  );
  const monthlyPlan = premiumPlans.find((plan) => plan.durationDays <= 31);
  const showPurchaseFlow = canStartPremiumPurchase({
    manualPaymentsEnabled: MANUAL_PREMIUM_PAYMENTS_ENABLED,
    isGuest: Boolean(state.user?.isGuest),
    isPremium: Boolean(state.user?.isPremium),
    verificationRequired: Boolean(state.premiumVerificationRequired),
    requestStatus: premiumRequest?.status,
  });

  const copy = async (value: string, success: string) => {
    try {
      await Clipboard.setStringAsync(value);
      setMessage(success);
    } catch {
      setMessage('Could not copy this value.');
    }
  };

  const submit = async () => {
    if (busy || !selectedPlan || !selectedMethod) return;
    const input = {
      planId: selectedPlan.id,
      paymentMethodId: selectedMethod.id,
      senderName: senderName.trim(),
    };
    const validationError = premiumRequestValidationError(input, confirmed);
    if (validationError) return setMessage(validationError);
    setBusy(true);
    try {
      const request = await submitPremiumRequest(input);
      setMessage(`Request ${request.requestCode} submitted for verification.`);
      setConfirmed(false);
      setStep(1);
    } catch (caught) {
      setMessage(userFacingError(caught, 'premium'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelPremiumRequest();
      setMessage('The payment request was cancelled.');
    } catch (caught) {
      setMessage(userFacingError(caught, 'premium'));
    } finally {
      setBusy(false);
    }
  };

  const verifyPremium = async () => {
    if (verificationBusy) return;
    setVerificationBusy(true);
    try {
      await refreshPremium();
      setMessage('Premium verification is up to date.');
    } catch (caught) {
      setMessage(userFacingError(caught, 'premium'));
    } finally {
      setVerificationBusy(false);
    }
  };

  const retryBanks = async () => {
    if (banksLoading) return;
    setBanksLoading(true);
    try {
      await refreshPremium();
    } catch (caught) {
      setMessage(userFacingError(caught, 'premium'));
    } finally {
      setBanksLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Reveal key={state.user?.isPremium ? 'premium-active' : 'premium-offer'}>
          <PremiumHero active={Boolean(state.user?.isPremium)} />
        </Reveal>

        {state.user?.isPremium ? (
          <Reveal delay={60}>
            <PremiumActiveCard
              planName={currentPlan?.name ?? 'Zemen Premium'}
              startedAt={state.user.premiumStartedAt}
              until={state.user.premiumUntil}
            />
          </Reveal>
        ) : null}

        {state.premiumVerificationRequired && !state.user?.isGuest ? (
          <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.error }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.errorContainer }]}><Icon source="wifi-alert" size={25} color={theme.colors.error} /></View>
                <View style={styles.grow}><Text variant="titleMedium" style={styles.bold}>Connect to verify Premium</Text><Text variant="bodySmall" style={styles.muted}>Your subscription is safe. This device only needs a quick secure verification.</Text></View>
              </View>
              <NetworkActivity visible={verificationBusy} label="Verifying Premium…" />
              <Button mode="contained" icon="shield-refresh-outline" loading={verificationBusy} disabled={verificationBusy} contentStyle={styles.action} onPress={() => void verifyPremium()}>Verify now</Button>
            </Card.Content>
          </Card>
        ) : null}

        {!state.user?.isPremium && state.user?.premiumStatus === 'expired' ? (
          <ExpiredPremiumCard
            until={state.user.premiumUntil}
            canRenewHere={MANUAL_PREMIUM_PAYMENTS_ENABLED}
          />
        ) : null}

        {!MANUAL_PREMIUM_PAYMENTS_ENABLED && !state.user?.isPremium ? (
          <PlayStoreAccessCard
            isGuest={Boolean(state.user?.isGuest)}
            onSignIn={startAuthentication}
          />
        ) : null}

        {MANUAL_PREMIUM_PAYMENTS_ENABLED && !state.user?.isPremium && hasOpenRequest && premiumRequest ? (
          <Reveal delay={80}>
            <RequestStatusCard
              request={premiumRequest}
              planName={premiumPlans.find((plan) => plan.id === premiumRequest.planId)?.name ?? 'Premium plan'}
              bankName={premiumPaymentMethods.find((method) => method.id === premiumRequest.paymentMethodId)?.name ?? premiumRequest.paymentMethodId}
              busy={busy}
              onCopy={(value) => void copy(value, 'Request code copied.')}
              onTelegram={() => void Linking.openURL(CONTACTS.telegram)}
              onCancel={() => showDialog({
                title: 'Cancel payment request?',
                body: 'Cancel only if the bank or transfer information is incorrect. This cannot be undone.',
                icon: 'file-cancel-outline',
                tone: 'danger',
                actions: [
                  { label: 'Keep request', tone: 'neutral' },
                  { label: 'Cancel request', tone: 'danger', onPress: () => void cancel() },
                ],
              })}
            />
          </Reveal>
        ) : null}

        {MANUAL_PREMIUM_PAYMENTS_ENABLED && premiumRequest?.status === 'rejected' && !state.user?.isPremium ? (
          <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.error }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.errorContainer }]}><Icon source="alert-circle-outline" size={24} color={theme.colors.error} /></View>
                <View style={styles.grow}><Text variant="titleMedium" style={styles.bold}>Previous request needs correction</Text><Text variant="bodySmall" style={styles.muted}>{premiumRequest.reviewNote || 'The transfer could not be matched. Review the details and submit a new request.'}</Text></View>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {MANUAL_PREMIUM_PAYMENTS_ENABLED ? (state.user?.isGuest ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.row}><Icon source="account-lock-outline" size={34} color={theme.colors.primary} /><View style={styles.grow}><Text variant="titleLarge" style={styles.bold}>Sign in to choose Premium</Text><Text variant="bodyMedium" style={styles.muted}>Your plan and payment request must be connected to a verified student account.</Text></View></View>
              <Button mode="contained" icon="login-variant" contentStyle={styles.action} onPress={startAuthentication}>Sign in or create account</Button>
            </Card.Content>
          </Card>
        ) : state.user?.isPremium ? null : loading ? (
          <View style={styles.loading}><ActivityIndicator /><Text>Loading Premium plans…</Text></View>
        ) : showPurchaseFlow ? (
          <>
            <FlowProgress step={step} />
            <Reveal key={step} distance={14}>
              {step === 1 ? (
                <PlanStep plans={premiumPlans} selectedId={planId} monthlyPrice={monthlyPlan?.priceEtb ?? 149} onSelect={setPlanId} />
              ) : selectedPlan ? (
                <View style={styles.stepSection}>
                  <PaymentStep
                    methods={premiumPaymentMethods}
                    selectedId={paymentMethodId}
                    plan={selectedPlan}
                    onSelect={setPaymentMethodId}
                    onCopy={(value) => void copy(value, 'Account number copied.')}
                    loading={banksLoading}
                    onRetry={() => void retryBanks()}
                  />
                  {selectedMethod ? (
                    <SubmitStep
                      senderName={senderName}
                      confirmed={confirmed}
                      busy={busy}
                      onSenderName={setSenderName}
                      onConfirm={() => setConfirmed((value) => !value)}
                      onSubmit={() => void submit()}
                    />
                  ) : null}
                </View>
              ) : null}
            </Reveal>

            <View style={styles.navigationRow}>
              {step === 2 ? <Button mode="outlined" icon="arrow-left" style={styles.navButton} contentStyle={styles.action} onPress={() => setStep(1)}>Change plan</Button> : <View style={styles.navButton} />}
              {step === 1 ? <Button mode="contained" icon="arrow-right" style={styles.navButton} contentStyle={styles.action} disabled={!selectedPlan} onPress={() => setStep(2)}>Continue</Button> : null}
            </View>
          </>
        ) : null) : null}

        {!showPurchaseFlow && state.user?.isPremium ? <BenefitsCard /> : null}

        {!MANUAL_PREMIUM_PAYMENTS_ENABLED && !state.user?.isPremium ? <BenefitsCard /> : null}

        {MANUAL_PREMIUM_PAYMENTS_ENABLED && !state.user?.isPremium ? <Card mode="contained" style={[styles.noticeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content style={styles.notice}>
            <Icon source="shield-check-outline" size={22} color={theme.colors.primary} />
            <Text variant="bodySmall" style={styles.noticeText}>Premium activates only after Zemen Academy matches your transfer with the selected bank, amount, sender name, and request details.</Text>
          </Card.Content>
        </Card> : null}
        <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={4200}>{message}</Snackbar>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function PremiumHero({ active }: { active: boolean }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroGlowOne} /><View style={styles.heroGlowTwo} />
      <View style={styles.crownCircle}><Icon source={active ? 'crown' : 'crown-outline'} size={39} color={GOLD_DARK} /></View>
      <Text variant="headlineMedium" style={styles.heroTitle}>{active ? 'You are Zemen Premium' : 'Learn without limits.'}</Text>
      <Text variant="bodyLarge" style={styles.heroBody}>
        {active
          ? `Quizzes, explanations, study notes, offline learning, and timetable tools are ready${V1_PAST_PAPERS_ENABLED ? ', including entrance exams' : ''}.`
          : MANUAL_PREMIUM_PAYMENTS_ENABLED
            ? 'Choose one access period. Every plan includes the complete learning experience.'
            : 'Sign in to use Premium access already connected to your Zemen Academy account.'}
      </Text>
      <View style={styles.heroTrust}><Icon source="shield-check" size={16} color={GOLD} /><Text variant="labelMedium" style={styles.heroTrustText}>{active ? 'ACTIVE SUBSCRIPTION • SECURE ACCESS' : MANUAL_PREMIUM_PAYMENTS_ENABLED ? 'TWO SIMPLE STEPS • SECURE ACCESS' : 'ACCOUNT-BASED • SECURE ACCESS'}</Text></View>
    </View>
  );
}

function premiumDate(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not available';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function PremiumActiveCard({ planName, startedAt, until }: { planName: string; startedAt?: string | null; until?: string | null }) {
  const theme = useTheme();
  const daysRemaining = premiumDaysRemaining(until);
  return (
    <Card mode="outlined" style={[styles.goldCard, { backgroundColor: theme.dark ? '#2A2312' : '#FFF8E4' }]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}><View style={styles.goldIcon}><Icon source="check-decagram" size={29} color={GOLD_TEXT} /></View><View style={styles.grow}><Text variant="titleLarge" style={styles.bold}>Your Premium subscription</Text><Text variant="bodySmall" style={styles.muted}>{planName} • Active</Text></View><Chip icon="crown" style={styles.goldChip}>Premium</Chip></View>
        <View style={styles.subscriptionDates}>
          <View style={styles.subscriptionDate}><Text variant="labelSmall" style={styles.fieldLabel}>START DATE</Text><Text variant="titleMedium" style={styles.bold}>{premiumDate(startedAt)}</Text></View>
          <View style={styles.subscriptionDivider} />
          <View style={styles.subscriptionDate}><Text variant="labelSmall" style={styles.fieldLabel}>EXPIRATION DATE</Text><Text variant="titleMedium" style={styles.bold}>{until ? premiumDate(until) : 'No expiration'}</Text></View>
        </View>
        <View style={[styles.activeSummary, { backgroundColor: theme.dark ? '#3A3018' : '#FFF1BD' }]}><Icon source="calendar-check-outline" size={21} color={GOLD_TEXT} /><Text variant="bodyMedium" style={styles.grow}>{daysRemaining === null ? 'Your Premium access remains active.' : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining in your subscription.`}</Text></View>
        <Text variant="bodyMedium">Your complete learning library is ready. You do not need to subscribe again while this plan is active.</Text>
      </Card.Content>
    </Card>
  );
}

function ExpiredPremiumCard({ until, canRenewHere }: { until?: string | null; canRenewHere: boolean }) {
  const theme = useTheme();
  return (
    <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon source="calendar-remove-outline" size={26} color={theme.colors.onSurfaceVariant} />
          </View>
          <View style={styles.grow}>
            <Text variant="titleMedium" style={styles.bold}>Your previous Premium period ended</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {until ? `Access ended on ${premiumDate(until)}. ` : ''}{canRenewHere ? 'Choose a new access period below to renew.' : 'This account does not currently have active Premium access.'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

function PlayStoreAccessCard({ isGuest, onSignIn }: { isGuest: boolean; onSignIn: () => void }) {
  const theme = useTheme();
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source="shield-crown-outline" size={27} color={theme.colors.primary} />
          </View>
          <View style={styles.grow}>
            <Text variant="titleLarge" style={styles.bold}>Premium account access</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              Premium activation is managed independently on zemenacademy.com. This app securely recognizes access already linked to your Zemen Academy account.
            </Text>
          </View>
        </View>
        {isGuest ? (
          <Button mode="contained" icon="login-variant" contentStyle={styles.action} onPress={onSignIn}>
            Sign in to check access
          </Button>
        ) : (
          <View style={[styles.activeSummary, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Icon source="account-check-outline" size={21} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={styles.grow}>You are signed in. After activation, Premium will appear here automatically—no bank details are entered in this app.</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function FlowProgress({ step }: { step: FlowStep }) {
  const labels = ['Choose plan', 'Transfer & submit'];
  return <View style={styles.progress}>{labels.map((label, index) => { const number = (index + 1) as FlowStep; const active = number <= step; return <View key={label} style={styles.progressItem}><View style={[styles.progressDot, active && styles.progressDotActive]}><Text variant="labelMedium" style={[styles.progressNumber, active && styles.progressNumberActive]}>{number}</Text></View><Text variant="labelSmall" style={[styles.progressLabel, active && styles.bold]}>{label}</Text>{index < labels.length - 1 ? <View style={[styles.progressLine, number < step && styles.progressLineActive]} /> : null}</View>; })}</View>;
}

function PlanStep({ plans, selectedId, monthlyPrice, onSelect }: { plans: PremiumPlan[]; selectedId: string; monthlyPrice: number; onSelect: (id: string) => void }) {
  return (
    <View style={styles.stepSection}>
      <View style={styles.stepHeading}><Text variant="headlineSmall" style={styles.stepTitle}>Choose your access</Text><Text variant="bodyMedium" style={styles.muted}>Every plan includes the same complete Premium experience. Only the access period changes.</Text></View>
      <View style={styles.planGrid}>{plans.map((plan) => {
        const selected = plan.id === selectedId;
        const approximateMonths = Math.max(1, Math.round(plan.durationDays / 30));
        const savings = Math.max(0, monthlyPrice * approximateMonths - plan.priceEtb);
        const monthlyEquivalent = Math.round(plan.priceEtb / approximateMonths);
        return <PressableScale key={plan.id} onPress={() => onSelect(plan.id)} accessibilityLabel={`Select ${plan.name}`}><Card mode={selected ? 'contained' : 'outlined'} style={[styles.planCard, selected && styles.selectedPlan]}><Card.Content style={styles.planContent}><View style={styles.rowBetween}><View><Text variant="titleLarge" style={styles.bold}>{plan.name}</Text><Text variant="bodySmall" style={styles.muted}>{plan.durationDays === 30 ? '30 days' : plan.durationDays === 90 ? '90 days' : '365 days'}</Text></View>{plan.badge ? <Chip compact style={selected ? styles.goldChip : undefined}>{plan.badge}</Chip> : null}</View><View style={styles.priceRow}><Text variant="displaySmall" style={styles.price}>{plan.priceEtb.toLocaleString()}</Text><View><Text variant="titleMedium" style={styles.bold}>ETB</Text><Text variant="bodySmall" style={styles.muted}>total</Text></View></View><Text variant="bodyMedium" style={styles.planDescription}>{plan.description}</Text><View style={styles.planFacts}><MiniFact icon="calendar-check-outline" text={`${monthlyEquivalent} ETB / month`} />{savings > 0 ? <MiniFact icon="tag-outline" text={`Save ${savings} ETB`} gold /> : <MiniFact icon="swap-horizontal" text="Maximum flexibility" />}</View><View style={styles.selectedRow}><Icon source={selected ? 'check-circle' : 'circle-outline'} size={22} color={selected ? GOLD_BORDER : undefined} /><Text variant="labelLarge" style={styles.bold}>{selected ? 'Selected plan' : 'Choose this plan'}</Text></View></Card.Content></Card></PressableScale>;
      })}</View>
      <BenefitsCard compact />
    </View>
  );
}

function PaymentStep({ methods, selectedId, plan, onSelect, onCopy, loading, onRetry }: { methods: PremiumPaymentMethod[]; selectedId: string; plan: PremiumPlan; onSelect: (id: string) => void; onCopy: (value: string) => void; loading: boolean; onRetry: () => void }) {
  const theme = useTheme();
  const selected = methods.find((method) => method.id === selectedId);
  return <View style={styles.stepSection}><View style={styles.stepHeading}><Text variant="headlineSmall" style={styles.stepTitle}>Choose your bank</Text><Text variant="bodyMedium" style={styles.muted}>Select one bank, then transfer exactly {plan.priceEtb.toLocaleString()} ETB.</Text></View>{loading ? <Card mode="outlined" style={styles.bankStateCard}><Card.Content style={styles.bankState}><ActivityIndicator /><Text variant="titleSmall" style={styles.bold}>Loading secure payment accounts…</Text><Text variant="bodySmall" style={styles.muted}>This normally takes only a moment.</Text></Card.Content></Card> : methods.length ? <View style={styles.bankGrid}>{methods.map((method) => <BankChoice key={method.id} method={method} selected={method.id === selectedId} onPress={() => onSelect(method.id)} />)}</View> : <Card mode="outlined" style={styles.bankStateCard}><Card.Content style={styles.bankState}><Icon source="bank-off-outline" size={34} color={theme.colors.error} /><Text variant="titleMedium" style={styles.bold}>Payment accounts did not load</Text><Text variant="bodySmall" style={styles.muted}>Check your connection and try again. No payment should be sent until an account appears here.</Text><Button mode="contained" icon="refresh" onPress={onRetry}>Try again</Button></Card.Content></Card>}{selected ? <Card mode="outlined" style={styles.bankDetailCard}><Card.Content style={styles.cardContent}><View style={styles.row}><BankLogo method={selected} large /><View style={styles.grow}><Text variant="titleLarge" style={styles.bold}>{selected.name}</Text><Text variant="bodySmall" style={styles.muted}>Selected payment account</Text></View><Icon source="check-decagram" size={24} color={GOLD_BORDER} /></View><Divider /><Detail label="ACCOUNT HOLDER" value={selected.accountName} /><Detail label="ACCOUNT NUMBER" value={selected.accountNumber} prominent /><Button mode="contained" icon="content-copy" contentStyle={styles.action} onPress={() => onCopy(selected.accountNumber)}>Copy account number</Button><View style={[styles.transferBox, { backgroundColor: theme.dark ? '#3A3018' : '#FFF1BD' }]}><Text variant="labelMedium" style={styles.transferLabel}>TRANSFER EXACTLY</Text><Text variant="headlineMedium" style={styles.bold}>{plan.priceEtb.toLocaleString()} ETB</Text><Text variant="bodySmall" style={styles.muted}>The app records today’s submission date automatically.</Text></View></Card.Content></Card> : null}</View>;
}

function SubmitStep({ senderName, confirmed, busy, onSenderName, onConfirm, onSubmit }: { senderName: string; confirmed: boolean; busy: boolean; onSenderName: (value: string) => void; onConfirm: () => void; onSubmit: () => void }) {
  return <Card mode="outlined" style={styles.card}><Card.Content style={styles.cardContent}><View style={styles.stepHeading}><Text variant="titleLarge" style={styles.stepTitle}>Whose account sent the money?</Text><Text variant="bodyMedium" style={styles.muted}>Enter only the exact bank account-holder name. Nothing else is required.</Text></View><TextInput mode="outlined" label="Bank account-holder name" value={senderName} onChangeText={onSenderName} autoCapitalize="words" autoCorrect={false} left={<TextInput.Icon icon="account-outline" />} /><Text variant="bodySmall" style={styles.muted}>If a parent or another person paid, enter their bank account name.</Text><PressableScale onPress={onConfirm}><View style={styles.confirmRow}><Checkbox status={confirmed ? 'checked' : 'unchecked'} /><Text variant="bodySmall" style={styles.confirmText}>I transferred the exact amount shown above and this name is correct.</Text></View></PressableScale><NetworkActivity visible={busy} label="Submitting payment request…" detail="Zemen Academy will verify it manually." /><Button mode="contained" icon="shield-check-outline" loading={busy} disabled={busy || !confirmed || senderName.trim().length < 2} contentStyle={styles.action} onPress={onSubmit}>Send for verification</Button></Card.Content></Card>;
}

function BenefitsCard({ compact = false }: { compact?: boolean }) {
  return <Card mode="outlined" style={styles.benefitsCard}><Card.Content style={styles.cardContent}><View style={styles.row}><View style={styles.goldIcon}><Icon source="creation" size={24} color={GOLD_TEXT} /></View><View style={styles.grow}><Text variant="titleLarge" style={styles.bold}>Everything included</Text><Text variant="bodySmall" style={styles.muted}>Premium access grows whenever new content is published.</Text></View></View><View style={compact ? styles.compactBenefits : styles.benefitList}>{PREMIUM_BENEFITS.map((benefit) => <View key={benefit.title} style={[styles.benefitRow, compact && styles.compactBenefitRow]}><View style={styles.benefitIcon}><Icon source={benefit.icon} size={20} color={GOLD_TEXT} /></View><View style={styles.grow}><Text variant="titleSmall" style={styles.bold}>{benefit.title}</Text>{!compact ? <Text variant="bodySmall" style={styles.muted}>{benefit.body}</Text> : null}</View></View>)}</View></Card.Content></Card>;
}

function BankChoice({ method, selected, onPress }: { method: PremiumPaymentMethod; selected: boolean; onPress: () => void }) {
  return <PressableScale onPress={onPress} style={styles.bankChoiceWrap}><Card mode={selected ? 'contained' : 'outlined'} style={[styles.bankChoice, selected && styles.selectedBank]}><Card.Content style={styles.bankChoiceContent}><BankLogo method={method} /><View style={styles.grow}><Text variant="titleMedium" style={styles.bold}>{method.name}</Text><Text variant="bodySmall" style={styles.muted}>Tap to use this bank</Text></View><Icon source={selected ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={selected ? GOLD_BORDER : undefined} /></Card.Content></Card></PressableScale>;
}

function BankLogo({ method, large = false }: { method: PremiumPaymentMethod; large?: boolean }) {
  const isCbe = method.id.toLowerCase().includes('cbe') || method.name.toLowerCase().includes('commercial');
  return <View style={[styles.bankLogo, large && styles.bankLogoLarge, { backgroundColor: isCbe ? '#712A83' : '#087CA7' }]}><Text variant={large ? 'titleMedium' : 'labelLarge'} style={styles.bankLogoText}>{isCbe ? 'CBE' : 'AB'}</Text></View>;
}

function RequestStatusCard({ request, planName, bankName, busy, onCopy, onTelegram, onCancel }: { request: PremiumRequest; planName: string; bankName: string; busy: boolean; onCopy: (value: string) => void; onTelegram: () => void; onCancel: () => void }) {
  const theme = useTheme();
  const underReview = request.status === 'under-review';
  return <Card mode="outlined" style={[styles.card, { borderColor: GOLD_BORDER }]}><Card.Content style={styles.cardContent}><View style={styles.rowBetween}><View style={styles.grow}><Text variant="titleLarge" style={styles.bold}>{underReview ? 'Payment is being checked' : 'Payment request received'}</Text><Text variant="bodySmall" style={styles.muted}>{planName} • {request.amountEtb.toLocaleString()} ETB</Text></View><Chip icon={underReview ? 'account-search-outline' : 'clock-outline'}>{underReview ? 'Under review' : 'Pending'}</Chip></View><View style={styles.timeline}><TimelineItem active icon="check" title="Submitted" /><TimelineLine active={underReview} /><TimelineItem active={underReview} icon="account-search" title="Verification" /><TimelineLine active={false} /><TimelineItem active={false} icon="crown" title="Premium" /></View><View style={[styles.codeBox, { backgroundColor: theme.dark ? '#3A3018' : '#FFF1BD' }]}><View><Text variant="labelSmall" style={styles.fieldLabel}>REQUEST CODE</Text><Text variant="titleMedium" style={styles.code}>{request.requestCode}</Text></View><Button compact icon="content-copy" onPress={() => onCopy(request.requestCode)}>Copy</Button></View><View style={styles.requestFacts}><AutoDetail icon="bank-outline" text={bankName} /><AutoDetail icon="account-outline" text={request.senderName} /><AutoDetail icon="calendar-outline" text={`Submitted ${formatPremiumRequestDate(request.paymentDate)}`} />{request.phone ? <AutoDetail icon="phone-outline" text={request.phone} /> : null}</View><Text variant="bodyMedium">You do not need to refresh this page. Zemen checks automatically and will celebrate here when Premium activates.</Text>{request.reviewNote ? <View style={[styles.reviewNote, { backgroundColor: theme.colors.secondaryContainer }]}><Icon source="message-text-outline" size={18} color={theme.colors.secondary} /><Text variant="bodySmall" style={styles.reviewNoteText}>{request.reviewNote}</Text></View> : null}<View style={styles.buttonRow}><Button mode="outlined" icon="send-outline" onPress={onTelegram}>Telegram support</Button>{request.status === 'pending' ? <Button mode="text" textColor={theme.colors.error} loading={busy} disabled={busy} onPress={onCancel}>Cancel</Button> : null}</View></Card.Content></Card>;
}

function Detail({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) { return <View style={styles.detail}><Text variant="labelSmall" style={styles.fieldLabel}>{label}</Text><Text variant={prominent ? 'titleLarge' : 'titleMedium'} style={prominent ? styles.accountNumber : styles.bold}>{value}</Text></View>; }
function MiniFact({ icon, text, gold = false }: { icon: string; text: string; gold?: boolean }) { return <View style={styles.miniFact}><Icon source={icon} size={17} color={gold ? GOLD_BORDER : undefined} /><Text variant="labelMedium" style={gold ? styles.goldText : undefined}>{text}</Text></View>; }
function AutoDetail({ icon, text }: { icon: string; text: string }) { return <View style={styles.autoDetail}><Icon source={icon} size={18} color={GOLD_BORDER} /><Text variant="bodySmall" style={styles.grow}>{text}</Text></View>; }
function TimelineItem({ active, icon, title }: { active: boolean; icon: string; title: string }) { return <View style={styles.timelineItem}><View style={[styles.timelineDot, active && styles.timelineDotActive]}><Icon source={icon} size={15} color={active ? GOLD_DARK : '#888'} /></View><Text variant="labelSmall" style={active ? styles.bold : styles.muted}>{title}</Text></View>; }
function TimelineLine({ active }: { active: boolean }) { return <View style={[styles.timelineLine, active && styles.timelineLineActive]} />; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, grow: { flex: 1, gap: 3 }, bold: { fontWeight: '800' }, muted: { opacity: 0.66 }, goldText: { color: GOLD_TEXT, fontWeight: '800' },
  hero: { minHeight: 265, borderRadius: 30, padding: 25, alignItems: 'center', justifyContent: 'center', gap: 11, backgroundColor: GOLD_DARK, overflow: 'hidden' }, heroGlowOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#5E4716', opacity: 0.35, top: -100, right: -55 }, heroGlowTwo: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: GOLD, opacity: 0.18, bottom: -75, left: -25 }, crownCircle: { width: 76, height: 76, borderRadius: 25, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' }, heroTitle: { color: '#FFF8E4', fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' }, heroBody: { color: '#D8CEB6', textAlign: 'center', lineHeight: 24, maxWidth: 520 }, heroTrust: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 5 }, heroTrustText: { color: GOLD, letterSpacing: 0.8, fontWeight: '800' },
  goldCard: { borderRadius: ui.radius.lg, borderColor: GOLD_BORDER, borderWidth: 1.5 }, goldIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F8E7AC', alignItems: 'center', justifyContent: 'center' }, iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  subscriptionDates: { flexDirection: 'row', alignItems: 'stretch', gap: 13 }, subscriptionDate: { flex: 1, gap: 5 }, subscriptionDivider: { width: 1, backgroundColor: GOLD_BORDER, opacity: 0.35 }, activeSummary: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, borderRadius: ui.radius.md },
  card: { borderRadius: ui.radius.lg }, cardContent: { gap: 15, paddingVertical: 18 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, rowBetween: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between' }, loading: { alignItems: 'center', gap: 10, paddingVertical: 35 }, action: { minHeight: 52 },
  progress: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 10, marginTop: 4 }, progressItem: { width: '50%', alignItems: 'center', gap: 5 }, progressDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E6E4DF', alignItems: 'center', justifyContent: 'center' }, progressDotActive: { backgroundColor: GOLD }, progressNumber: { color: '#777' }, progressNumberActive: { color: GOLD_DARK, fontWeight: '900' }, progressLabel: { opacity: 0.66 }, progressLine: { position: 'absolute', left: '75%', top: 16, width: '50%', height: 2, backgroundColor: '#E6E4DF' }, progressLineActive: { backgroundColor: GOLD },
  stepSection: { gap: 16 }, stepHeading: { gap: 5 }, stepTitle: { fontWeight: '900', letterSpacing: -0.5 }, planGrid: { gap: 11 }, planCard: { borderRadius: ui.radius.lg }, selectedPlan: { borderColor: GOLD_BORDER, borderWidth: 2 }, planContent: { gap: 13, paddingVertical: 18 }, goldChip: { borderColor: GOLD_BORDER }, priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 }, price: { fontWeight: '900', letterSpacing: -1.3 }, planDescription: { lineHeight: 21 }, planFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, miniFact: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 5 }, selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitsCard: { borderRadius: ui.radius.lg, borderColor: '#D7BF78' }, benefitList: { gap: 14 }, compactBenefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 }, benefitRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, compactBenefitRow: { flexBasis: '46%', flexGrow: 1, minWidth: 125 }, benefitIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF1BD', alignItems: 'center', justifyContent: 'center' },
  bankGrid: { gap: 10 }, bankStateCard: { borderRadius: ui.radius.lg }, bankState: { alignItems: 'center', gap: 10, paddingVertical: 25 }, bankChoiceWrap: { borderRadius: ui.radius.lg }, bankChoice: { borderRadius: ui.radius.lg }, selectedBank: { borderColor: GOLD_BORDER, borderWidth: 2 }, bankChoiceContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 }, bankLogo: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, bankLogoLarge: { width: 58, height: 58, borderRadius: 19 }, bankLogoText: { color: '#FFF', fontWeight: '900', letterSpacing: 0.4 }, bankDetailCard: { borderRadius: ui.radius.lg, borderColor: GOLD_BORDER }, detail: { gap: 4 }, fieldLabel: { opacity: 0.58, fontWeight: '900', letterSpacing: 0.9 }, accountNumber: { fontWeight: '900', letterSpacing: 1 }, transferBox: { padding: 15, borderRadius: ui.radius.md, alignItems: 'center', gap: 3 }, transferLabel: { color: GOLD_BORDER, fontWeight: '900', letterSpacing: 0.7 },
  summaryStrip: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: ui.radius.md }, autoDetails: { gap: 9 }, autoDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 }, confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, padding: 9, borderRadius: ui.radius.md }, confirmText: { flex: 1, lineHeight: 19, paddingTop: 8 }, navigationRow: { flexDirection: 'row', gap: 10 }, navButton: { flex: 1 },
  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }, timelineItem: { alignItems: 'center', gap: 5 }, timelineDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' }, timelineDotActive: { backgroundColor: GOLD }, timelineLine: { width: 42, height: 2, backgroundColor: '#E5E5E5', marginBottom: 19 }, timelineLineActive: { backgroundColor: GOLD }, codeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderRadius: ui.radius.md, padding: 13 }, code: { fontWeight: '900', letterSpacing: 1 }, requestFacts: { gap: 8 }, reviewNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: ui.radius.sm, padding: 11 }, reviewNoteText: { flex: 1, lineHeight: 18 }, buttonRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  noticeCard: { borderRadius: ui.radius.md }, notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, noticeText: { flex: 1, lineHeight: 19, opacity: 0.78 },
});
