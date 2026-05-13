export type MockChat = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  role: string;
  messages: Array<{
    id: string;
    text: string;
    time: string;
    fromMe?: boolean;
  }>;
};

export const MOCK_CHATS: MockChat[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Product Designer',
    lastMessage: 'I can deliver the project by Friday',
    time: '2m ago',
    unread: 3,
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    messages: [
      { id: 'm1', text: 'Hey, are you still available for the redesign?', time: '9:10 AM' },
      { id: 'm2', text: 'Yes, I can help with that.', time: '9:12 AM', fromMe: true },
      { id: 'm3', text: 'Perfect. I can deliver the project by Friday.', time: '9:14 AM' },
    ],
  },
  {
    id: '2',
    name: 'Mike Chen',
    role: 'Mobile Engineer',
    lastMessage: 'Sounds good, let me check the details',
    time: '15m ago',
    unread: 0,
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    messages: [
      { id: 'm1', text: 'Can you review the latest build?', time: '10:00 AM' },
      { id: 'm2', text: 'Sounds good, let me check the details.', time: '10:03 AM', fromMe: true },
    ],
  },
  {
    id: '3',
    name: 'Emily Davis',
    role: 'Project Manager',
    lastMessage: 'Payment has been released',
    time: '1h ago',
    unread: 1,
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
    messages: [
      { id: 'm1', text: 'The milestone is complete.', time: '11:45 AM' },
      { id: 'm2', text: 'Payment has been released.', time: '11:47 AM' },
    ],
  },
  {
    id: '4',
    name: 'Alex Rivera',
    role: 'Startup Founder',
    lastMessage: 'Can we schedule a call tomorrow?',
    time: '3h ago',
    unread: 0,
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
    messages: [
      { id: 'm1', text: 'Can we schedule a call tomorrow?', time: '12:10 PM' },
      { id: 'm2', text: 'Yes, I’m free after 2 PM.', time: '12:12 PM', fromMe: true },
    ],
  },
  {
    id: '5',
    name: 'Priya Sharma',
    role: 'UI Engineer',
    lastMessage: 'The design files are ready',
    time: '5h ago',
    unread: 2,
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    messages: [
      { id: 'm1', text: 'The design files are ready.', time: '8:30 AM' },
      { id: 'm2', text: 'Great, I’ll review them now.', time: '8:34 AM', fromMe: true },
    ],
  },
  {
    id: '6',
    name: 'James Wilson',
    role: 'Content Strategist',
    lastMessage: 'Thanks for the quick turnaround!',
    time: '1d ago',
    unread: 0,
    avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100',
    messages: [
      { id: 'm1', text: 'Thanks for the quick turnaround!', time: 'Yesterday' },
      { id: 'm2', text: 'Happy to help.', time: 'Yesterday', fromMe: true },
    ],
  },
  {
    id: '7',
    name: 'Lisa Park',
    role: 'Marketing Lead',
    lastMessage: 'I have a question about the budget',
    time: '1d ago',
    unread: 0,
    avatar: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=100',
    messages: [
      { id: 'm1', text: 'I have a question about the budget.', time: 'Yesterday' },
      { id: 'm2', text: 'Sure, what would you like to adjust?', time: 'Yesterday', fromMe: true },
    ],
  },
];

export function getMockChatById(id: string) {
  return MOCK_CHATS.find((chat) => chat.id === id);
}