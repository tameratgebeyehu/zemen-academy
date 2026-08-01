import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { Reveal } from '@/components/Motion';
import { ui } from '@/data/theme';

export type AppDialogTone = 'primary' | 'warning' | 'danger';

export interface AppDialogAction {
  label: string;
  onPress?: () => void;
  tone?: 'primary' | 'danger' | 'neutral';
  icon?: string;
}

export interface AppDialogOptions {
  title: string;
  body: string;
  icon?: string;
  tone?: AppDialogTone;
  actions?: AppDialogAction[];
  dismissable?: boolean;
  onDismiss?: () => void;
}

interface AppDialogContextValue {
  showDialog: (options: AppDialogOptions) => void;
  dismissDialog: () => void;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: PropsWithChildren) {
  const [options, setOptions] = useState<AppDialogOptions | null>(null);

  const dismissDialog = useCallback(() => {
    const onDismiss = options?.onDismiss;
    setOptions(null);
    onDismiss?.();
  }, [options]);
  const showDialog = useCallback((next: AppDialogOptions) => setOptions(next), []);
  const value = useMemo(() => ({ showDialog, dismissDialog }), [dismissDialog, showDialog]);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AppDialog options={options} onDismiss={dismissDialog} />
    </AppDialogContext.Provider>
  );
}

export function useAppDialog(): AppDialogContextValue {
  const context = useContext(AppDialogContext);
  if (!context) throw new Error('useAppDialog must be used inside AppDialogProvider.');
  return context;
}

function AppDialog({ options, onDismiss }: { options: AppDialogOptions | null; onDismiss: () => void }) {
  const theme = useTheme();
  if (!options) return null;

  const tone = options.tone ?? 'primary';
  const toneColors = tone === 'danger'
    ? { background: theme.colors.errorContainer, foreground: theme.colors.error }
    : tone === 'warning'
      ? { background: theme.colors.tertiaryContainer, foreground: theme.colors.onTertiaryContainer }
      : { background: theme.colors.primaryContainer, foreground: theme.colors.primary };
  const actions = options.actions?.length
    ? options.actions.slice(0, 2)
    : [{ label: 'OK', tone: 'primary' as const }];

  const runAction = (action: AppDialogAction) => {
    onDismiss();
    action.onPress?.();
  };

  return (
    <Portal>
      <Modal
        visible
        dismissable={options.dismissable !== false}
        onDismiss={onDismiss}
        contentContainerStyle={styles.wrap}
      >
        <Reveal distance={12}>
          <Card
            mode="elevated"
            style={[
              styles.card,
              theme.dark ? ui.shadow.dark : ui.shadow.light,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <Card.Content style={styles.content}>
              <View style={styles.header}>
                <View style={[styles.icon, { backgroundColor: toneColors.background }]}>
                  <Icon source={options.icon ?? (tone === 'danger' ? 'alert-outline' : 'information-outline')} size={26} color={toneColors.foreground} />
                </View>
                <View style={styles.copy}>
                  <Text variant="titleLarge" style={styles.title}>{options.title}</Text>
                  <Text variant="bodyMedium" style={styles.body}>{options.body}</Text>
                </View>
                {options.dismissable !== false ? (
                  <IconButton icon="close" size={20} accessibilityLabel="Close dialog" onPress={onDismiss} style={styles.close} />
                ) : null}
              </View>
              <View style={styles.actions}>
                {actions.map((action) => {
                  const danger = action.tone === 'danger';
                  const primary = action.tone === 'primary' || (actions.length === 1 && action.tone !== 'neutral');
                  return (
                    <Button
                      key={action.label}
                      mode={primary || danger ? 'contained' : 'outlined'}
                      icon={action.icon}
                      buttonColor={danger ? theme.colors.error : undefined}
                      textColor={danger ? theme.colors.onError : undefined}
                      contentStyle={styles.actionContent}
                      style={styles.action}
                      onPress={() => runAction(action)}
                    >
                      {action.label}
                    </Button>
                  );
                })}
              </View>
            </Card.Content>
          </Card>
        </Reveal>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 470, alignSelf: 'center', paddingHorizontal: 18 },
  card: { borderRadius: ui.radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  content: { gap: 22, paddingHorizontal: 20, paddingVertical: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  icon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, gap: 6, paddingTop: 2 },
  title: { fontWeight: '900', letterSpacing: -0.45 },
  body: { opacity: 0.7, lineHeight: 21 },
  close: { margin: -8, marginLeft: -3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  action: { flex: 1, borderRadius: ui.radius.sm },
  actionContent: { minHeight: 48 },
});
