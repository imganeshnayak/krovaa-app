type ConversationCache<TMessages = any, TConversation = any> = {
  messages?: TMessages[];
  conversation?: TConversation | null;
  lastFetched?: number;
  scrollOffset?: number;
};

const conversationCache = new Map<string, ConversationCache>();
let conversationsListCache: { conversations?: any[]; lastFetched?: number } | null = null;
const conversationsListSubscribers = new Set<() => void>();

function notifyConversationsListSubscribers() {
  conversationsListSubscribers.forEach((listener) => listener());
}

export function getConversationCache(id: string) {
  return conversationCache.get(id) ?? null;
}

export function setConversationCache(id: string, data: Partial<ConversationCache>) {
  const existing = conversationCache.get(id) ?? {};
  const next = { ...existing, ...data, lastFetched: Date.now() };
  conversationCache.set(id, next);
  return next;
}

export function updateConversationMessages(id: string, messages: any[]) {
  return setConversationCache(id, { messages, lastFetched: Date.now() });
}

export function setConversationScrollOffset(id: string, offset: number) {
  const existing = conversationCache.get(id) ?? {};
  const next = { ...existing, scrollOffset: offset };
  conversationCache.set(id, next);
  return next;
}

export function clearConversationCache(id: string) {
  conversationCache.delete(id);
}

export function getConversationsListCache() {
  return conversationsListCache;
}

export function setConversationsListCache(data: { conversations?: any[] }) {
  conversationsListCache = { ...data, lastFetched: Date.now() };
  notifyConversationsListSubscribers();
  return conversationsListCache;
}

export function subscribeConversationsListCache(listener: () => void) {
  conversationsListSubscribers.add(listener);
  return () => {
    conversationsListSubscribers.delete(listener);
  };
}

export default {
  getConversationCache,
  setConversationCache,
  updateConversationMessages,
  setConversationScrollOffset,
  clearConversationCache,
  getConversationsListCache,
  setConversationsListCache,
  subscribeConversationsListCache,
};
