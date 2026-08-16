import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) console.error('[app] Render failure', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ failed: false });
  };

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.screen} accessibilityRole="alert">
        <View style={styles.mark}><Text style={styles.markText}>Z</Text></View>
        <Text style={styles.title}>Zemen Academy needs a fresh start</Text>
        <Text style={styles.body}>
          Your saved downloads and progress are still on this device. Try opening the app again.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try opening Zemen Academy again"
          onPress={this.retry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FC',
    paddingHorizontal: 28,
    gap: 16,
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#182553',
  },
  markText: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  title: { color: '#111827', fontSize: 23, lineHeight: 29, fontWeight: '900', textAlign: 'center' },
  body: { color: '#5E6472', fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 420 },
  button: {
    minWidth: 160,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#182553',
    paddingHorizontal: 22,
  },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
