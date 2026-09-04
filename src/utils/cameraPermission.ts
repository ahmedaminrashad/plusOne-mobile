import { AppState, Platform, PermissionsAndroid, Alert, Linking, NativeModules } from 'react-native';

type CameraKitNative = {
  requestDeviceCameraAuthorization?: () => Promise<boolean>;
  checkDeviceCameraAuthorizationStatus?: () => Promise<boolean>;
};

function getCameraKitNative(): CameraKitNative | null {
  // New-arch TurboModule name used by react-native-camera-kit
  const turbo = (NativeModules as { RNCameraKitModule?: CameraKitNative }).RNCameraKitModule;
  if (turbo?.requestDeviceCameraAuthorization) return turbo;
  const legacy = (NativeModules as { CameraKit?: CameraKitNative }).CameraKit;
  if (legacy?.requestDeviceCameraAuthorization) return legacy;
  return null;
}

/** Request camera access on both platforms. Returns true when granted. */
export async function requestCameraPermission(labels: {
  title: string;
  message: string;
  ok: string;
  cancel: string;
  deniedTitle: string;
  deniedMessage: string;
  openSettings?: string;
  onManualEntry?: () => void;
  manualEntryLabel?: string;
}): Promise<boolean> {
  let granted = false;

  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: labels.title,
        message: labels.message,
        buttonPositive: labels.ok,
        buttonNegative: labels.cancel,
      },
    );
    granted = result === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    const native = getCameraKitNative();
    try {
      if (native?.checkDeviceCameraAuthorizationStatus) {
        granted = await native.checkDeviceCameraAuthorizationStatus();
      }
      if (!granted && AppState.currentState === 'active' && native?.requestDeviceCameraAuthorization) {
        granted = await native.requestDeviceCameraAuthorization();
      }
    } catch {
      granted = false;
    }
  }

  if (granted) return true;
  if (AppState.currentState !== 'active') return false;

  const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [];
  if (labels.onManualEntry) {
    buttons.push({
      text: labels.manualEntryLabel ?? labels.ok,
      onPress: labels.onManualEntry,
    });
  }
  buttons.push({
    text: labels.openSettings ?? 'Open Settings',
    onPress: () => { void Linking.openSettings(); },
  });
  buttons.push({ text: labels.cancel, style: 'cancel' });
  Alert.alert(labels.deniedTitle, labels.deniedMessage, buttons);
  return false;
}
