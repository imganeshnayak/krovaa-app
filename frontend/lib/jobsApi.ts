import { API_BASE_URL } from './apiBaseUrl';

export type Job = {
  id: string;
  title: string;
  company: string;
  budget: string;
  location: string;
  type: 'Design' | 'Development' | 'Marketing' | 'Writing' | 'Video';
  description: string;
  posted: string;
  avatar: string;
  posterId: string;
  posterName: string;
  hasApplied: boolean;
  applicantCount: number;
};

export async function getJobs(token?: string, category?: string, searchQuery?: string) {
  try {
    let url = `${API_BASE_URL}/api/jobs?`;
    if (category && category !== 'All') {
      url += `category=${encodeURIComponent(category)}&`;
    }
    if (searchQuery) {
      url += `q=${encodeURIComponent(searchQuery)}&`;
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to fetch jobs' };
    }

    return { data: data.jobs as Job[], error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function postJob(
  token: string,
  jobData: {
    title: string;
    budget: string;
    location: string;
    type: string;
    description: string;
    company?: string;
  }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(jobData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to post job' };
    }

    return { data: data.job as Job, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function applyJob(token: string, jobId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to apply for job' };
    }

    return {
      data: data as { message: string; jobId: string; conversationId: string },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}
