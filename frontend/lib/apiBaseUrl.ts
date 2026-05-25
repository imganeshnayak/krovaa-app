import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const DEFAULT_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000',
  ios: 'http://localhost:5000',
  web: 'http://localhost:5000',
  default: 'http://localhost:5000',
});

const EXPO_TUNNEL_HOST_SUFFIXES = ['.exp.direct', '.expo.dev'];

function getExpoHostIp() {
  try {
    const url = Linking.createURL('/');
    const match = url.match(/^[a-z]+:\/\/([^/:?#]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function isExpoTunnelHost(host: string) {
  const normalizedHost = host.trim().toLowerCase();
  return EXPO_TUNNEL_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix));
}

function normalizeApiUrl(value: string) {
  return value.replace(/:\s+(\d+)/g, ':$1').trim();
}

function parseApiUrlOrNull(value: string) {
  try {
    return new URL(normalizeApiUrl(value));
  } catch {
    return null;
  }
}

export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    const parsed = parseApiUrlOrNull(fromEnv);
    if (parsed) {
      return parsed.origin;
    }
  }

  const expoHostIp = getExpoHostIp();
  if (
    expoHostIp &&
    expoHostIp !== 'localhost' &&
    expoHostIp !== '127.0.0.1' &&
    !isExpoTunnelHost(expoHostIp)
  ) {
    return `http://${expoHostIp}:5000`;
  }

  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = getApiBaseUrl();
