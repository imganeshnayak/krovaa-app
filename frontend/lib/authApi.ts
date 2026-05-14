import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const DEFAULT_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  web: 'http://localhost:4000',
  default: 'http://localhost:4000',
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
  // Recover from common mistakes such as "http://host: 4000".
  return value.replace(/:\s+(\d+)/g, ':$1').trim();
}

function parseApiUrlOrNull(value: string) {
  try {
    return new URL(normalizeApiUrl(value));
  } catch {
    return null;
  }
}

function getApiBaseUrl() {
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
    // Expo Go on a physical device can reach the dev machine over LAN.
    return `http://${expoHostIp}:4000`;
  }

  return DEFAULT_API_BASE_URL;
}

const API_BASE_URL = getApiBaseUrl();

type AuthResponse = {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
  };
};

type OtpSendResponse = {
  message: string;
};

type OtpVerifyResponse = AuthResponse;

async function request<TResponse>(path: string, body: Record<string, string>) {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { error?: string; message?: string } & TResponse;

    if (!response.ok) {
      return { error: data.error || data.message || 'Something went wrong.' };
    }

    return { data: data as TResponse, error: null };
  } catch {
    return { error: `Unable to reach the authentication server at ${url}.` };
  }
}

export async function registerUser(email: string, password: string, retypePassword: string) {
  return request<AuthResponse>('/api/auth/register', { email, password, retypePassword });
}

export async function loginUser(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', { email, password });
}

export async function sendRegistrationOtp(email: string, password: string, retypePassword: string) {
  return request<OtpSendResponse>('/api/auth/register/send-otp', { email, password, retypePassword });
}

export async function verifyRegistrationOtp(email: string, otp: string) {
  return request<OtpVerifyResponse>('/api/auth/register/verify-otp', { email, otp });
}
