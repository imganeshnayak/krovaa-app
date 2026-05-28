import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ShareProfilePayload = {
  title: string;
  text: string;
  url: string;
};

export type ShareProfileInput = {
  profileUrl: string;
  userName: string;
  userTitle?: string;
};

export function buildShareProfilePayload({ profileUrl, userName, userTitle }: ShareProfileInput): ShareProfilePayload {
  const cleanedName = userName.trim() || 'this profile';
  const cleanedTitle = userTitle?.trim();

  return {
    title: 'Check out this profile!',
    text: cleanedTitle ? `${cleanedName} - ${cleanedTitle}` : cleanedName,
    url: profileUrl,
  };
}

function canUseWebShareApi(payload: ShareProfilePayload) {
  if (Platform.OS !== 'web') {
    return false;
  }

  if (typeof navigator === 'undefined') {
    return false;
  }

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') {
    return false;
  }

  try {
    return nav.canShare(payload as ShareData);
  } catch {
    return false;
  }
}

export async function attemptProfileShare(payload: ShareProfilePayload): Promise<'native' | 'fallback' | 'cancelled'> {
  if (Platform.OS === 'web') {
    if (!canUseWebShareApi(payload)) {
      return 'fallback';
    }

    try {
      await navigator.share(payload as ShareData);
      return 'native';
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return 'cancelled';
      }
      return 'fallback';
    }
  }

  try {
    const { Share } = await import('react-native');
    const result = await Share.share({
      title: payload.title,
      message: `${payload.text}\n${payload.url}`,
      url: payload.url,
    });

    if (result.action === Share.dismissedAction) {
      return 'cancelled';
    }

    return 'native';
  } catch {
    return 'fallback';
  }
}

export async function copyProfileLink(profileUrl: string): Promise<boolean> {
  const cleanUrl = profileUrl.trim();
  if (!cleanUrl) {
    return false;
  }

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(cleanUrl);
        return true;
      } catch {
        // fall through to legacy copy path
      }
    }

    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.value = cleanUrl;
      input.setAttribute('readonly', 'true');
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();

      try {
        return document.execCommand('copy');
      } catch {
        return false;
      } finally {
        document.body.removeChild(input);
      }
    }

    return false;
  }

  try {
    await Clipboard.setStringAsync(cleanUrl);
    return true;
  } catch {
    return false;
  }
}