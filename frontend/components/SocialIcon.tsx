import React from 'react';
import { View } from 'react-native';
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Github, Globe } from 'lucide-react-native';

type Props = { platform: string; size?: number; color?: string };

export const SocialIcon = ({ platform, size = 16, color = '#111827' }: Props) => {
  const p = platform.toLowerCase();
  if (p.includes('facebook')) return <Facebook size={size} color={color} />;
  if (p.includes('twitter')) return <Twitter size={size} color={color} />;
  if (p.includes('instagram')) return <Instagram size={size} color={color} />;
  if (p.includes('youtube')) return <Youtube size={size} color={color} />;
  if (p.includes('linkedin')) return <Linkedin size={size} color={color} />;
  if (p.includes('github')) return <Github size={size} color={color} />;
  return <Globe size={size} color={color} />;
};

export default SocialIcon;
