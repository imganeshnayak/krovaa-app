import { API_BASE_URL } from './apiBaseUrl';

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
