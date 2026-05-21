import { API_BASE_URL } from './apiBaseUrl';

type RawParticipant = {
  id?: string;
  _id?: string;
  fullName?: string;
  avatar?: string;
  email?: string;
  username?: string;
  userCode?: string;
};

type RawConversation = {
  id?: string;
  _id?: string;
  participants?: RawParticipant[];
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RawSender = RawParticipant | string;

type RawMessage = {
  id?: string;
  _id?: string;
  conversation?: string;
  sender?: RawSender;
  text?: string;
  attachments?: Array<{ url: string; type: 'image' | 'video' | 'file' }>;
  createdAt?: string;
  updatedAt?: string;
  clientMessageId?: string;
};

export type ChatParticipant = {
  id: string;
  fullName: string;
  avatar: string;
  email?: string;
  username?: string;
  userCode?: string;
};

export type ChatConversation = {
  id: string;
  participants: ChatParticipant[];
  lastMessage: string;
  lastMessageAt: string;
  createdAt?: string;
  updatedAt?: string;
  unreadCount?: number;
};

export type ChatMessage = {
  id: string;
  conversation: string;
  sender: RawSender;
  text: string;
  attachments: Array<{ url: string; type: 'image' | 'video' | 'file' }>;
  createdAt: string;
  updatedAt?: string;
  clientMessageId?: string;
};

function normalizeParticipant(participant: RawParticipant | undefined): ChatParticipant {
  return {
    id: participant?.id ?? participant?._id ?? '',
    fullName: participant?.fullName ?? 'Unknown',
    avatar:
      participant?.avatar ??
      'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    email: participant?.email,
    username: participant?.username,
    userCode: participant?.userCode,
  };
}

function normalizeConversation(conversation: RawConversation): ChatConversation {
  return {
    id: conversation.id ?? conversation._id ?? '',
    participants: (conversation.participants ?? []).map((participant) => normalizeParticipant(participant)),
    lastMessage: conversation.lastMessage ?? '',
    lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt ?? '',
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    unreadCount: (conversation as any).unreadCount ? Number((conversation as any).unreadCount) : 0,
  };
}

function normalizeMessage(message: RawMessage): ChatMessage {
  return {
    id: message.id ?? message._id ?? '',
    conversation: message.conversation ?? '',
    sender: message.sender ?? '',
    text: message.text ?? '',
    attachments: message.attachments ?? [],
    createdAt: message.createdAt ?? '',
    updatedAt: message.updatedAt,
    clientMessageId: message.clientMessageId,
  };
}

async function authGet<T>(token: string, path: string) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as { error?: string } & T;

    if (!response.ok) {
      return { data: null, error: data.error || 'Something went wrong.' };
    }

    return { data: data as T, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

async function authPost<T>(token: string, path: string, body: Record<string, unknown>) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { error?: string } & T;

    if (!response.ok) {
      return { data: null, error: data.error || 'Something went wrong.' };
    }

    return { data: data as T, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

async function authDelete<T>(token: string, path: string) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as { error?: string } & T;

    if (!response.ok) {
      return { data: null, error: data.error || 'Something went wrong.' };
    }

    return { data: data as T, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || 'Network request failed' };
  }
}

export async function getConversations(token: string) {
  const result = await authGet<{ conversations: RawConversation[] }>(token, '/api/chats/conversations');
  return {
    data: result.data
      ? { conversations: result.data.conversations.map((conversation) => normalizeConversation(conversation)) }
      : null,
    error: result.error,
  };
}

export async function getConversationMessages(token: string, conversationId: string) {
  const result = await authGet<{ messages: RawMessage[] }>(
    token,
    `/api/chats/conversations/${conversationId}/messages`
  );

  return {
    data: result.data
      ? { messages: result.data.messages.map((message) => normalizeMessage(message)) }
      : null,
    error: result.error,
  };
}

export async function createConversationWithUserId(token: string, userId: string) {
  const result = await authPost<{ conversation: RawConversation }>(token, '/api/chats/conversations', {
    participants: [userId],
  });

  return {
    data: result.data ? { conversation: normalizeConversation(result.data.conversation) } : null,
    error: result.error,
  };
}

export async function markConversationRead(token: string, conversationId: string) {
  const result = await authPost<{ success: boolean; unreadCount?: number }>(token, `/api/chats/conversations/${conversationId}/read`, {});
  return { data: result.data ?? null, error: result.error };
}

export async function deleteMessage(token: string, conversationId: string, messageId: string) {
  const result = await authDelete<{ success: boolean }>(token, `/api/chats/conversations/${conversationId}/messages/${messageId}`);
  return { data: result.data ?? null, error: result.error };
}

export async function forwardMessage(token: string, conversationId: string, messageId: string, targetConversationId: string) {
  const result = await authPost<{ message: RawMessage }>(token, `/api/chats/conversations/${conversationId}/messages/${messageId}/forward`, { targetConversationId });
  return { data: result.data ? { message: normalizeMessage(result.data.message) } : null, error: result.error };
}

export async function searchChatsAndMessages(token: string, query: string) {
  const result = await authGet<{
    conversations: RawConversation[];
    messages: (RawMessage & { conversationDetail?: RawConversation })[];
  }>(token, `/api/chats/search?q=${encodeURIComponent(query)}`);

  return {
    data: result.data
      ? {
          conversations: result.data.conversations.map((convo) => normalizeConversation(convo)),
          messages: result.data.messages.map((msg) => {
            const normalized = normalizeMessage(msg) as ChatMessage & { conversationDetail?: ChatConversation };
            if (msg.conversationDetail) {
              normalized.conversationDetail = normalizeConversation(msg.conversationDetail);
            }
            return normalized;
          }),
        }
      : null,
    error: result.error,
  };
}
