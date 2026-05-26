import { API_BASE_URL } from './apiBaseUrl';

export type Job = {
  id: string;
  title: string;
  company: string;
  budget: string;
  location: string;
  type: string;
  mode: string;
  description: string;
  posted: string;
  avatar: string;
  posterId: string;
  posterName: string;
  hasApplied: boolean;
  applicantCount: number;
};

export type AppliedJob = Job & {
  applicationStatus: 'pending' | 'viewed' | 'shortlisted' | 'accepted' | 'rejected';
  applicationId: string;
  appliedAt: string;
};

export async function getJobs(
  token?: string,
  filters?: {
    category?: string;
    q?: string;
    location?: string;
    mode?: string;
    excludePosterId?: string;
  }
) {
  try {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== 'All') {
      params.append('category', filters.category);
    }
    if (filters?.q) {
      params.append('q', filters.q);
    }
    if (filters?.location) {
      params.append('location', filters.location);
    }
    if (filters?.mode && filters.mode !== 'ALL_MODES') {
      params.append('mode', filters.mode);
    }
    if (filters?.excludePosterId) {
      params.append('excludePosterId', filters.excludePosterId);
    }

    const queryString = params.toString();
    let url = `${API_BASE_URL}/api/jobs`;
    if (queryString) url += `?${queryString}`;

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

export async function getMyJobs(token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to fetch your listings' };
    }

    return { data: data.jobs as Job[], error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function getAppliedJobs(token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/applied`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to fetch applied jobs' };
    }

    return { data: data.jobs as AppliedJob[], error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function withdrawApplication(token: string, jobId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/withdraw`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to withdraw application' };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error?.message || 'Network request failed' };
  }
}

export async function postJob(
  token: string,
  jobData: {
    title: string;
    budget: string;
    location: string;
    type: string;
    mode?: string;
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

export async function updateJob(
  token: string,
  jobId: string,
  jobData: {
    title?: string;
    budget?: string;
    location?: string;
    type?: string;
    mode?: string;
    description?: string;
    company?: string;
  }
) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(jobData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to update job' };
    }

    return { data: data.job as Job, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function deleteJob(token: string, jobId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to delete job' };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error?.message || 'Network request failed' };
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

export type JobApplicant = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  profession: string;
  bio: string;
  email: string;
  rating?: number;
  reviewCount?: number;
  status?: string;
  appliedAt: string;
  viewedAt?: string;
  shortlistedAt?: string;
  applicationId: string;
};

export type ApplicantStats = {
  total: number;
  viewed: number;
  shortlisted: number;
  accepted: number;
  rejected: number;
  pending: number;
  conversionRate: string;
};

export async function getJobApplicants(token: string, jobId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/applicants`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to fetch applicants' };
    }

    return {
      data: data.applicants as JobApplicant[],
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function getUserProfile(token: string, userId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) return { data: null, error: data.error || 'Failed to fetch profile' };
    return { data: data.user, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function getJobApplicantStats(token: string, jobId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/applicants/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to fetch stats' };
    }

    return {
      data: data.stats as ApplicantStats,
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function updateApplicantStatus(
  token: string,
  jobId: string,
  applicationId: string,
  status: 'pending' | 'viewed' | 'shortlisted' | 'rejected' | 'accepted'
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/jobs/${jobId}/applicants/${applicationId}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Failed to update status' };
    }

    return {
      data: data,
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}
