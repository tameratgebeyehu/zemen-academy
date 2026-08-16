import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

let androidBrowserPackage: Promise<string | undefined> | undefined;

async function preferredAndroidBrowser(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  androidBrowserPackage ??= WebBrowser.getCustomTabsSupportingBrowsersAsync()
    .then((result) => (
      result.preferredBrowserPackage
      ?? result.defaultBrowserPackage
      ?? result.browserPackages[0]
    ))
    .catch(() => undefined);
  return androidBrowserPackage;
}

/** Opens a public HTTPS page in an actual browser instead of resolving it as an app link. */
export async function openExternalBrowser(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only secure website links can be opened.');

  const browserPackage = await preferredAndroidBrowser();
  return WebBrowser.openBrowserAsync(url, {
    browserPackage,
    createTask: true,
    useProxyActivity: true,
    showInRecents: true,
    showTitle: true,
    enableDefaultShareMenuItem: true,
  });
}
