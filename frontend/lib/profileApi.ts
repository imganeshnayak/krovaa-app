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
    return `http://${expoHostIp}:4000`;
  }

  return DEFAULT_API_BASE_URL;
}

const API_BASE_URL = getApiBaseUrl();

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  userCode: string;
  fullName: string;
  location: string;
  city: string;
  pincode: string;
  phoneNumber: string;
  age: number | null;
  gender: string;
  profession: 'tech' | 'creative' | 'engineering' | 'professional' | 'freelancer' | 'student' | 'none' | 'other';
  bio: string;
  avatar: string;
  skills: string[];
  stats: {
    jobsDone: number;
    reviews: number;
    earned: number;
  };
  blockedUsers?: string[];
}

type ProfileResponse = {
  message?: string;
  user: UserProfile;
};

type StatsResponse = {
  message: string;
  stats: {
    jobsDone: number;
    reviews: number;
    earned: number;
  };
};

async function authRequest<TResponse>(
  path: string,
  method: 'GET' | 'PUT' = 'GET',
  token: string,
  body?: Record<string, unknown>
) {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const data = (await response.json()) as { error?: string } & TResponse;

    if (!response.ok) {
      return { error: data.error || 'Something went wrong.', data: null };
    }

    return { data: data as TResponse, error: null };
  } catch {
    return { error: `Unable to reach the profile server at ${url}.`, data: null };
  }
}

async function publicRequest<TResponse>(path: string) {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = (await response.json()) as { error?: string } & TResponse;

    if (!response.ok) {
      return { error: data.error || 'Something went wrong.', data: null };
    }

    return { data: data as TResponse, error: null };
  } catch {
    return { error: `Unable to reach the profile server at ${url}.`, data: null };
  }
}

export async function getCurrentUserProfile(token: string) {
  return authRequest<ProfileResponse>('/api/profile', 'GET', token);
}

export async function getUserProfile(userId: string) {
  return publicRequest<ProfileResponse>(`/api/profile/${userId}`);
}

export async function getUserProfileByCode(userCode: string) {
  return publicRequest<ProfileResponse>(`/api/profile/code/${encodeURIComponent(userCode)}`);
}

export async function getUserProfileByUsername(username: string) {
  return publicRequest<ProfileResponse>(`/api/profile/username/${encodeURIComponent(username)}`);
}

export async function updateUserProfile(
  token: string,
  updates: {
    fullName?: string;
    location?: string;
    city?: string;
    pincode?: string;
    phoneNumber?: string;
    age?: number | null;
    gender?: string;
    profession?: 'tech' | 'creative' | 'engineering' | 'professional' | 'freelancer' | 'student' | 'none' | 'other';
    bio?: string;
    avatar?: string;
    skills?: string[];
  }
) {
  return authRequest<ProfileResponse>('/api/profile', 'PUT', token, updates);
}

export async function updateUserStats(
  token: string,
  updates: {
    jobsDone?: number;
    reviews?: number;
    earned?: number;
  }
) {
  return authRequest<StatsResponse>('/api/profile/stats', 'PUT', token, updates);
}

export async function uploadProfilePhoto(token: string, photoUri: string) {
  const url = `${API_BASE_URL}/api/profile/photo`;
  const formData = new FormData();

  formData.append('photo', {
    uri: photoUri,
    name: `profile-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = (await response.json()) as { error?: string } & ProfileResponse;

    if (!response.ok) {
      return { error: data.error || 'Unable to upload photo.', data: null };
    }

    return { data: data as ProfileResponse, error: null };
  } catch {
    return { error: `Unable to reach the profile server at ${url}.`, data: null };
  }
}
