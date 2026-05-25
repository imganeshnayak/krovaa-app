import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const DEFAULT_API_BASE_URL = Platform.select({
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
  return value.replace(/:\s+(\d+)/g, ':$1').trim().replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    const sanitized = normalizeApiUrl(fromEnv);
    if (sanitized) {
      return sanitized;
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

  return DEFAULT_API_BASE_URL ?? 'http://localhost:5000';
}

export const API_BASE_URL = getApiBaseUrl();
console.log('[API] Initialized API_BASE_URL as:', API_BASE_URL);
