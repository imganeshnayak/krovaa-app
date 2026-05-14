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

export interface MyPost {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  createdAt: string;
  updatedAt: string;
}

type PostResponse = {
  message?: string;
  post: MyPost;
};

type DeleteResponse = {
  message: string;
};

type PostsListResponse = {
  posts: MyPost[];
};

export async function getMyPosts(token: string) {
  const url = `${API_BASE_URL}/api/posts/me`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as { error?: string } & PostsListResponse;

    if (!response.ok) {
      return { data: null, error: data.error || 'Unable to fetch posts.' };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: `Unable to reach the posts server at ${url}.` };
  }
}

export async function createMyPost(
  token: string,
  mediaUri: string,
  mediaMimeType: string,
  caption: string
) {
  const url = `${API_BASE_URL}/api/posts`;
  const formData = new FormData();

  const extension = mediaMimeType.startsWith('video/') ? 'mp4' : 'jpg';
  formData.append('media', {
    uri: mediaUri,
    name: `post-${Date.now()}.${extension}`,
    type: mediaMimeType,
  } as any);
  formData.append('caption', caption);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = (await response.json()) as { error?: string } & PostResponse;

    if (!response.ok) {
      return { data: null, error: data.error || 'Unable to upload post.' };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: `Unable to reach the posts server at ${url}.` };
  }
}

export async function updateMyPostCaption(token: string, postId: string, caption: string) {
  const url = `${API_BASE_URL}/api/posts/${postId}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ caption }),
    });

    const data = (await response.json()) as { error?: string } & PostResponse;

    if (!response.ok) {
      return { data: null, error: data.error || 'Unable to update post.' };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: `Unable to reach the posts server at ${url}.` };
  }
}

export async function deleteMyPost(token: string, postId: string) {
  const url = `${API_BASE_URL}/api/posts/${postId}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as { error?: string } & DeleteResponse;

    if (!response.ok) {
      return { data: null, error: data.error || 'Unable to delete post.' };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: `Unable to reach the posts server at ${url}.` };
  }
}
