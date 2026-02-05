import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = '@pattyshack_biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = '@pattyshack_biometric_credentials';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
}

// Check if device supports biometrics
export async function checkBiometricSupport(): Promise<BiometricStatus> {
  const isAvailable = await LocalAuthentication.hasHardwareAsync();
  const biometryType = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  return {
    isAvailable,
    biometryType,
    isEnrolled,
  };
}

// Get friendly name for biometric type
export function getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris Scanner';
  }
  return 'Biometrics';
}

// Authenticate using biometrics
export async function authenticateWithBiometrics(
  promptMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const status = await checkBiometricSupport();

    if (!status.isAvailable) {
      return { success: false, error: 'Biometric authentication not available on this device' };
    }

    if (!status.isEnrolled) {
      return { success: false, error: 'No biometrics enrolled on this device' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Authenticate to continue',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error === 'user_cancel' ? 'Authentication cancelled' : 'Authentication failed',
    };
  } catch (error) {
    return { success: false, error: 'An error occurred during authentication' };
  }
}

// Enable biometric login
export async function enableBiometricLogin(email: string, password: string): Promise<boolean> {
  try {
    // Verify biometrics first
    const authResult = await authenticateWithBiometrics('Enable biometric login');
    if (!authResult.success) {
      return false;
    }

    // Store credentials securely
    const credentials = JSON.stringify({ email, password });
    await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

    return true;
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    return false;
  }
}

// Disable biometric login
export async function disableBiometricLogin(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
    return true;
  } catch (error) {
    console.error('Error disabling biometric login:', error);
    return false;
  }
}

// Check if biometric login is enabled
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
}

// Get stored credentials after biometric auth
export async function getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  try {
    // Authenticate first
    const authResult = await authenticateWithBiometrics('Sign in with biometrics');
    if (!authResult.success) {
      return null;
    }

    // Retrieve stored credentials
    const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (!credentials) {
      return null;
    }

    return JSON.parse(credentials);
  } catch (error) {
    console.error('Error getting biometric credentials:', error);
    return null;
  }
}

// Quick biometric check (for re-auth scenarios)
export async function quickBiometricCheck(): Promise<boolean> {
  const result = await authenticateWithBiometrics('Verify your identity');
  return result.success;
}
