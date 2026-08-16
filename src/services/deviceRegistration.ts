import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { DeviceRegistrationIdentity, MobilePlatform } from '@/types';
import { deviceCategoryFromExpoType } from '@/utils/devicePolicy';

const INSTALLATION_ID_KEY = 'zemen-installation-id-v1';
let memoryInstallationId: string | null = null;

async function installationId(): Promise<string> {
  if (memoryInstallationId) return memoryInstallationId;
  let stored: string | null;
  try {
    stored = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  } catch {
    throw new Error('DEVICE-IDENTITY-READ: This phone could not read its secure app identity. Restart the phone or reinstall Zemen Academy.');
  }
  if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
    memoryInstallationId = stored;
    return stored;
  }
  const created = Crypto.randomUUID();
  try {
    await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  } catch {
    throw new Error('DEVICE-IDENTITY-SAVE: This phone could not save its secure app identity. Restart the phone or reinstall Zemen Academy.');
  }
  memoryInstallationId = created;
  return created;
}

export async function deviceRegistrationIdentity(): Promise<DeviceRegistrationIdentity | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  let resolvedType: number | null = null;
  let model = 'Mobile device';
  try {
    const Device = await import('expo-device');
    resolvedType = Device.deviceType ?? await Device.getDeviceTypeAsync().catch(() => null);
    model = Device.modelName?.trim() || Device.manufacturer?.trim() || model;
  } catch {
    // Existing development builds may not contain the newly installed native module yet.
  }
  return {
    installationId: await installationId(),
    deviceType: deviceCategoryFromExpoType(resolvedType),
    platform: Platform.OS as MobilePlatform,
    deviceName: model.slice(0, 120),
  };
}
