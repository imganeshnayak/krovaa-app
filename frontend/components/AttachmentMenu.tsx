import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image, Camera, FileText } from 'lucide-react-native';

interface AttachmentMenuProps {
  onSelect: (type: 'gallery' | 'camera' | 'document') => void;
  onClose: () => void;
}

export default function AttachmentMenu({ onSelect, onClose }: AttachmentMenuProps) {
  const menuItems = [
    {
      id: 'document',
      label: 'Document',
      icon: <FileText size={22} color="#FFF" />,
      backgroundColor: '#1E40AF',
    },
    {
      id: 'camera',
      label: 'Camera',
      icon: <Camera size={22} color="#FFF" />,
      backgroundColor: '#0EA5E9',
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: <Image size={22} color="#FFF" />,
      backgroundColor: '#38BDF8',
    },
  ] as const;

  return (
    <View style={styles.menuContainer}>
      <View style={styles.notchHandle} />

      <View style={styles.actionsRow}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.itemWrapper}
            activeOpacity={0.75}
            onPress={() => {
              onSelect(item.id);
              onClose();
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.backgroundColor }]}>
              {item.icon}
            </View>
            <Text style={styles.itemLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notchHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  itemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 75,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  itemLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
