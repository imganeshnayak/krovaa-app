import { API_BASE_URL } from './apiBaseUrl';

type AuthResponse = {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    userCode: string;
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

export async function registerUser(email: string, username: string, password: string, retypePassword: string) {
  return request<AuthResponse>('/api/auth/register', { email, username, password, retypePassword });
}

export async function loginUser(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', { email, password });
}

export async function sendRegistrationOtp(email: string, username: string, password: string, retypePassword: string) {
  return request<OtpSendResponse>('/api/auth/register/send-otp', { email, username, password, retypePassword });
}

export async function verifyRegistrationOtp(email: string, otp: string) {
  return request<OtpVerifyResponse>('/api/auth/register/verify-otp', { email, otp });
}
