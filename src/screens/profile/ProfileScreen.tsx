import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, Icon, List, SegmentedButtons, Switch, Text, useTheme } from 'react-native-paper';

import { useAppDialog } from '@/components/AppDialog';
import { IconTile } from '@/components/Motion';
import { NetworkActivity } from '@/components/NetworkActivity';
import { Screen, SectionTitle } from '@/components/Screen';
import { CONTACTS, MANUAL_PREMIUM_PAYMENTS_ENABLED, V1_DEFAULT_LANGUAGE, V1_PAST_PAPERS_ENABLED } from '@/config';
import { useApp } from '@/context/AppContext';
import { heroPalette, ui } from '@/data/theme';
import type { RootStackParamList } from '@/navigation/types';
import {
  getNotificationPermissionState,
  openNotificationSettings,
  requestNotificationPermission,
} from '@/services/notifications';
import type { Grade, Stream, ThemePreference } from '@/types';
import {
  notificationPermissionDescription,
  type NotificationPermissionState,
} from '@/utils/permissions';
import { openExternalBrowser } from '@/utils/externalBrowser';
import { userFacingError } from '@/utils/userFacingError';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, updateTheme, completeProfile, logout, startAuthentication, storageBytes, setNotificationsEnabled, t } = useApp();
  const { showDialog } = useAppDialog();
  const theme = useTheme();
  const hero = heroPalette(theme.dark);
  const profileHero = state.user?.isPremium ? {
    background: '#17130A', foreground: '#FFF7DF', muted: '#CFC2A4',
    overlay: '#2B2414', divider: '#59491F',
  } : hero;
  const [editingPlan, setEditingPlan] = useState(false);
  const [grade, setGrade] = useState<Grade>(state.preferences.grade);
  const [stream, setStream] = useState<Stream>(state.preferences.stream ?? 'Natural');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>('undetermined');
  const [notificationBusy, setNotificationBusy] = useState(false);
  const initials = (state.user?.name ?? 'Student').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const gradeLabel = `Grade ${state.preferences.grade}${state.preferences.grade >= 11 ? ` • ${state.preferences.stream}` : ''}`;
  const accountStatus = state.user?.isPremium
    ? { icon: 'shield-crown-outline', title: 'Premium account', detail: 'Full learning access is active.' }
    : state.user
      ? { icon: 'account-check-outline', title: 'Student account', detail: 'Your learning plan and preferences are saved.' }
      : { icon: 'account-arrow-right-outline', title: 'Guest access', detail: 'Sign in to keep your learning connected.' };

  useFocusEffect(useCallback(() => {
    let active = true;
    void getNotificationPermissionState().then((permission) => {
      if (active) setNotificationPermission(permission);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []));

  const manageNotifications = async (enabled: boolean) => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      if (!enabled) {
        await setNotificationsEnabled(false);
        return;
      }
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        const registered = await setNotificationsEnabled(true);
        if (!registered) {
          showDialog({
            title: 'Notifications enabled',
            body: 'Device notifications are on. Remote announcement registration will retry automatically when the service is available.',
            icon: 'bell-check-outline',
          });
        }
      } else if (permission === 'denied') {
        await setNotificationsEnabled(false);
        showDialog({
          title: 'Notifications are blocked',
          body: 'Allow notifications for Zemen Academy in your device settings, then turn this switch on again.',
          icon: 'bell-off-outline',
          tone: 'warning',
          actions: [
            { label: 'Not now', tone: 'neutral' },
            { label: 'Open settings', tone: 'primary', icon: 'cog-outline', onPress: () => void openNotificationSettings() },
          ],
        });
      } else if (permission === 'unavailable') {
        await setNotificationsEnabled(false);
        showDialog({
          title: 'Development build required',
          body: 'Notifications cannot be tested in Expo Go. Use the installed Zemen Academy development or Play Store build.',
          icon: 'cellphone-information',
          tone: 'warning',
        });
      }
    } catch (caught) {
      showDialog({
        title: 'Could not update notifications',
        body: userFacingError(caught, 'notifications'),
        icon: 'wifi-alert',
        tone: 'danger',
      });
    } finally {
      setNotificationBusy(false);
    }
  };

  const savePlan = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await completeProfile({
        grade,
        stream: grade >= 11 ? stream : undefined,
        language: V1_DEFAULT_LANGUAGE,
        reminderTime: state.preferences.reminderTime,
      });
      setEditingPlan(false);
    } catch (caught) {
      showDialog({ title: 'Could not save', body: userFacingError(caught, 'profile'), icon: 'content-save-alert-outline', tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (caught) {
      showDialog({ title: 'Could not sign out', body: userFacingError(caught, 'general'), icon: 'logout-variant', tone: 'danger' });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen safeTop safeBottom={false}>
      <Card mode="contained" style={[styles.heroCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: profileHero.background, borderColor: state.user?.isPremium ? '#B98716' : 'transparent', borderWidth: state.user?.isPremium ? 1.5 : 0 }]}>
        <Card.Content style={styles.heroContent}>
          <Avatar.Text
            size={70}
            label={initials || 'S'}
            style={[styles.avatar, { backgroundColor: state.user?.isPremium ? '#E1B84B' : profileHero.foreground }]}
            labelStyle={[styles.avatarLabel, { color: profileHero.background }]}
          />
          <View style={styles.grow}>
            <Text variant="titleLarge" style={[styles.heroName, { color: profileHero.foreground }]}>{state.user?.name}</Text>
            <Text variant="bodySmall" style={[styles.heroMeta, { color: profileHero.muted }]}>{state.user?.email ?? 'Guest account'}</Text>
            <View style={styles.heroBadge}>
              <Icon source={state.user?.isPremium ? 'crown' : 'school-outline'} size={15} color={state.user?.isPremium ? '#E1B84B' : profileHero.foreground} />
              <Text variant="labelMedium" style={{ color: profileHero.foreground, fontWeight: '700' }}>{state.user?.isPremium ? `PREMIUM • ${gradeLabel}` : gradeLabel}</Text>
            </View>
          </View>
        </Card.Content>
        <View style={[styles.accountStatus, { backgroundColor: profileHero.overlay }]}>
          <View style={[styles.accountStatusIcon, { borderColor: profileHero.divider }]}>
            <Icon source={accountStatus.icon} size={20} color={state.user?.isPremium ? '#E1B84B' : profileHero.foreground} />
          </View>
          <View style={styles.accountStatusCopy}>
            <Text variant="labelLarge" style={[styles.accountStatusTitle, { color: profileHero.foreground }]}>
              {accountStatus.title}
            </Text>
            <Text variant="bodySmall" style={{ color: profileHero.muted }} numberOfLines={2}>
              {accountStatus.detail}
            </Text>
          </View>
          <Icon source="check-decagram-outline" size={20} color={state.user?.isPremium ? '#E1B84B' : profileHero.muted} />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <SectionTitle>Learning plan</SectionTitle>
        <Button compact icon={editingPlan ? 'close' : 'pencil-outline'} disabled={saving} onPress={() => setEditingPlan((value) => !value)}>
          {editingPlan ? 'Cancel' : 'Edit'}
        </Button>
      </View>
      <Card mode="outlined" style={[styles.sectionCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          {!editingPlan ? (
            <View style={styles.planSummary}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="book-education-outline" size={25} color={theme.colors.primary} />
              </View>
              <View style={styles.grow}>
                <Text variant="titleMedium" style={styles.bold}>{gradeLabel}</Text>
                <Text variant="bodySmall" style={styles.muted}>Subjects and recommendations match this plan.</Text>
              </View>
              <Icon source="check-decagram" size={22} color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <Text variant="labelLarge" style={styles.bold}>Grade</Text>
              <SegmentedButtons
                value={String(grade)}
                onValueChange={(value) => setGrade(Number(value) as Grade)}
                buttons={[9, 10, 11, 12].map((value) => ({ value: String(value), label: String(value) }))}
              />
              {grade >= 11 ? (
                <>
                  <Text variant="labelLarge" style={styles.bold}>Stream</Text>
                  <SegmentedButtons
                    value={stream}
                    onValueChange={(value) => setStream(value as Stream)}
                    buttons={[
                      { value: 'Natural', label: 'Natural', icon: 'atom' },
                      { value: 'Social', label: 'Social', icon: 'earth' },
                    ]}
                  />
                </>
              ) : null}
              <Button mode="contained" loading={saving} disabled={saving} contentStyle={styles.saveButton} onPress={() => void savePlan()}>
                {saving ? 'Saving plan…' : 'Save learning plan'}
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      <NetworkActivity
        visible={saving}
        label="Saving your learning plan…"
        detail="Your current settings remain available while the account updates."
      />

      <SectionTitle>{t('settings')}</SectionTitle>
      <Card mode="outlined" style={[styles.sectionCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.settingLabel}>
            <Icon source="theme-light-dark" size={20} color={theme.colors.primary} />
            <Text variant="labelLarge" style={styles.bold}>{t('appearance')}</Text>
          </View>
          <SegmentedButtons
            value={state.preferences.theme}
            onValueChange={(value) => updateTheme(value as ThemePreference)}
            buttons={[
              { value: 'system', label: t('system'), icon: 'cellphone' },
              { value: 'light', label: t('light'), icon: 'white-balance-sunny' },
              { value: 'dark', label: t('dark'), icon: 'weather-night' },
            ]}
          />
          <Divider style={styles.innerDivider} />
          <List.Item
            title="Notifications"
            description={notificationBusy
              ? 'Updating notification settings…'
              : state.preferences.notificationsEnabled === false
                ? 'Off in Zemen Academy'
                : notificationPermission === 'granted'
                  ? 'On · Announcements and study reminders'
                  : notificationPermissionDescription(notificationPermission)}
            titleStyle={styles.bold}
            descriptionNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon={state.preferences.notificationsEnabled !== false && notificationPermission === 'granted' ? 'bell-check-outline' : 'bell-outline'} />}
            right={() => (
              <Switch
                value={state.preferences.notificationsEnabled !== false && notificationPermission === 'granted'}
                disabled={notificationBusy}
                onValueChange={(enabled) => void manageNotifications(enabled)}
              />
            )}
            disabled={notificationBusy}
          />
        </Card.Content>
      </Card>

      <SectionTitle>More</SectionTitle>
      <Card mode="outlined" style={[styles.listCard, theme.dark ? ui.shadow.dark : ui.shadow.light, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title={state.user?.isPremium ? 'Premium active' : MANUAL_PREMIUM_PAYMENTS_ENABLED ? 'Upgrade to Premium' : 'Premium access'}
          description={state.user?.isPremium
            ? 'View your plan and expiration'
            : MANUAL_PREMIUM_PAYMENTS_ENABLED
              ? 'Plans from 149 ETB · Manual verification'
              : 'Sign in to check account access'}
          left={() => state.user?.isPremium
            ? <View style={styles.premiumListIcon}><Icon source="crown" size={22} color="#6A4700" /></View>
            : <IconTile source="crown-outline" size={21} style={styles.listIcon} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Premium')}
        />
        <Divider />
        <List.Item
          title={t('downloads')}
          description={`${state.unitDownloads.length + state.noteDownloads.length + (V1_PAST_PAPERS_ENABLED ? state.paperDownloads.length : 0)} items • ${Math.max(1, Math.ceil(storageBytes / 1024))} KB`}
          left={() => <IconTile source="download-outline" size={21} style={styles.listIcon} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Main', { screen: 'DownloadsTab' })}
        />
        <Divider />
        <List.Item
          title="Help center"
          description="Accounts, devices, downloads, Premium, and question reports"
          left={() => <IconTile source="lifebuoy" size={21} style={styles.listIcon} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('HelpCenter')}
        />
        <Divider />
        <List.Item
          title="Privacy & terms"
          description="Privacy policy, data controls, and terms of use"
          left={() => <IconTile source="shield-lock-outline" size={21} style={styles.listIcon} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('PrivacyCenter')}
        />
        <Divider />
        <List.Item
          title="Account deletion"
          description="Request deletion of your account and associated data"
          left={() => <IconTile source="account-remove-outline" size={21} style={styles.listIcon} />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={() => void openExternalBrowser(CONTACTS.accountDeletion).catch(() => showDialog({
            title: 'Could not open the website',
            body: 'Open zemenacademy.com/account-deletion in your browser, or use the email option in Privacy & terms.',
            icon: 'web-cancel',
            tone: 'warning',
          }))}
        />
        <Divider />
        <List.Item
          title={t('about')}
          description="Mission, contact, and app version"
          left={() => <IconTile source="information-outline" size={21} style={styles.listIcon} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('About')}
        />
      </Card>

      {state.user?.isGuest ? (
        <Button
          mode="contained"
          icon="account-plus-outline"
          contentStyle={styles.logout}
          onPress={startAuthentication}
        >
          Sign in or create account
        </Button>
      ) : (
        <Button
          mode="outlined"
          icon="logout"
          textColor={theme.colors.error}
          loading={loggingOut}
          disabled={loggingOut}
          contentStyle={styles.logout}
          onPress={() => showDialog({
            title: 'Sign out?',
            body: 'Your downloaded quizzes and notes will remain safely stored on this device.',
            icon: 'logout-variant',
            tone: 'danger',
            actions: [
              { label: 'Stay signed in', tone: 'neutral' },
              { label: t('logout'), tone: 'danger', onPress: () => void signOut() },
            ],
          })}
        >
          {loggingOut ? 'Signing out…' : t('logout')}
        </Button>
      )}
      <NetworkActivity
        visible={loggingOut}
        label="Signing you out…"
        detail="Offline downloads will remain on this device."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: ui.radius.lg, overflow: 'hidden' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 17 },
  avatar: {},
  avatarLabel: { fontWeight: '900' },
  grow: { flex: 1, gap: 3 },
  heroName: { fontWeight: '900', letterSpacing: -0.4 },
  heroMeta: { opacity: 0.9 },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  accountStatus: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 12 },
  accountStatusIcon: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  accountStatusCopy: { flex: 1, minWidth: 0, gap: 1 },
  accountStatusTitle: { fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionCard: { borderRadius: ui.radius.md },
  cardContent: { gap: 13, paddingVertical: 16 },
  planSummary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '800' },
  muted: { opacity: 0.64 },
  saveButton: { minHeight: 48 },
  settingLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  innerDivider: { marginVertical: 3 },
  listCard: { borderRadius: ui.radius.md, overflow: 'hidden' },
  listIcon: { width: 40, height: 40, borderRadius: 13, marginLeft: 12, alignSelf: 'center' },
  premiumListIcon: { width: 40, height: 40, borderRadius: 13, marginLeft: 12, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3D77D' },
  logout: { minHeight: 50 },
});
