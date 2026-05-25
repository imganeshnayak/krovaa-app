import { API_BASE_URL } from './apiBaseUrl';

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
  coverPhotoUrl?: string;
  userGoal?: 'OFFER_SERVICE' | 'HIRE_PROFESSIONALS' | '';
  skills: string[];
  socialLinks?: Array<{ platform: string; url: string }>;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  verificationRequestedAt?: string | null;
  verificationFee?: number;
  ratingsSummary?: {
    averageRating: number;
    totalRatings: number;
  };
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

type VerificationStatusResponse = {
  verificationStatus: 'none' | 'pending' | 'verified' | 'rejected';
  verificationFee: number;
  verificationRequestedAt: string | null;
};

type VerificationFeeResponse = {
  fee: number;
};

type RatingsResponse = {
  ratings: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    reviewer: {
      id: string;
      fullName: string;
      avatar: string;
      username: string;
    };
  }>;
  summary: {
    averageRating: number;
    totalRatings: number;
  };
};

async function authRequest<TResponse>(
  path: string,
  method: 'GET' | 'PUT' | 'POST' | 'DELETE' = 'GET',
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
    coverPhotoUrl?: string;
    userGoal?: 'OFFER_SERVICE' | 'HIRE_PROFESSIONALS' | '';
    skills?: string[];
    socialLinks?: Array<{ platform: string; url: string }>;
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

export async function uploadCoverPhoto(token: string, photoUri: string) {
  const url = `${API_BASE_URL}/api/profile/cover-photo`;
  const formData = new FormData();

  formData.append('photo', {
    uri: photoUri,
    name: `cover-${Date.now()}.jpg`,
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
      return { error: data.error || 'Unable to upload cover photo.', data: null };
    }

    return { data: data as ProfileResponse, error: null };
  } catch {
    return { error: `Unable to reach the profile server at ${url}.`, data: null };
  }
}

export async function deleteProfilePhoto(token: string) {
  return authRequest<ProfileResponse>('/api/profile/photo', 'DELETE', token);
}

export async function deleteCoverPhoto(token: string) {
  return authRequest<ProfileResponse>('/api/profile/cover-photo', 'DELETE', token);
}

export async function getVerificationStatus(token: string) {
  return authRequest<VerificationStatusResponse>('/api/profile/verification/status', 'GET', token);
}

export async function getVerificationFee() {
  const url = `${API_BASE_URL}/api/profile/verification/fee`;

  try {
    const response = await fetch(url, { method: 'GET' });
    const data = (await response.json()) as { error?: string } & VerificationFeeResponse;

    if (!response.ok) {
      return { error: data.error || 'Unable to fetch verification fee.', data: null };
    }

    return { data: data as VerificationFeeResponse, error: null };
  } catch {
    return { error: `Unable to reach the profile server at ${url}.`, data: null };
  }
}

export async function applyForVerification(token: string) {
  return authRequest<{ message: string; status: string; fee: number }>('/api/profile/verification/request', 'POST', token, {});
}

export async function getRatingEligibility(token: string, userId: string) {
  return authRequest<{ canRate: boolean; reason: string }>(`/api/profile/rating-eligibility/${encodeURIComponent(userId)}`, 'GET', token);
}

export async function rateUser(
  token: string,
  reviewedId: string,
  rating: number,
  comment: string
) {
  return authRequest<{ message: string; rating: { reviewedId: number; rating: number; comment: string }; summary: { averageRating: number; totalRatings: number } }>(
    '/api/profile/ratings',
    'POST',
    token,
    { reviewedId, rating, comment }
  );
}

export async function getUserRatings(userId: string) {
  return publicRequest<RatingsResponse>(`/api/profile/ratings/${encodeURIComponent(userId)}`);
}
