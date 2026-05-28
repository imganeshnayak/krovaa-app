import type { ChatMessage } from './chatApi';

// ExtendedChatMessage augments ChatMessage with a couple optional runtime flags
export type ExtendedChatMessage = ChatMessage & {
  isForwarded?: boolean;
  forwardedFrom?: any;
};

export default {} as unknown;
