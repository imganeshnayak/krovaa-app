import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FileText } from 'lucide-react-native';

interface DocumentMessageProps {
  fileName: string;
  fileSize?: string;
  pageCount?: number;
  fileExtension?: string;
  isMine: boolean;
}

const { width } = Dimensions.get('window');

export default function DocumentMessage({
  fileName,
  fileSize,
  pageCount,
  fileExtension: ext,
  isMine,
}: DocumentMessageProps) {
  const extension = (ext || fileName.split('.').pop() || 'FILE').toUpperCase();

  return (
    <View style={[styles.bubbleContainer, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <View style={styles.previewContainer}>
        <View style={styles.iconBadge}>
          <FileText size={32} color="#0EA5E9" strokeWidth={2} />
          <Text style={styles.badgeText}>{extension}</Text>
        </View>
      </View>

      <View style={[styles.metaDataContainer, isMine ? styles.metaMine : styles.metaTheirs]}>
        <Text style={styles.fileNameText} numberOfLines={1}>
          {fileName}
        </Text>

        <View style={styles.detailsRow}>
          <Text style={[styles.fileDetailsText, isMine ? styles.detailsMine : styles.detailsTheirs]}>
            {pageCount ? `${pageCount} pages \u2022 ` : ''}{fileSize ?? ''}{fileSize ? ' \u2022 ' : ''}{extension}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    width: width * 0.72,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleMine: {
    borderColor: '#0284C7',
    alignSelf: 'flex-end',
  },
  bubbleTheirs: {
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  previewContainer: {
    height: 95,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0EA5E9',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metaDataContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  metaMine: {
    backgroundColor: '#0284C7',
  },
  metaTheirs: {
    backgroundColor: '#F1F5F9',
  },
  fileNameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  fileDetailsText: {
    fontSize: 11,
    fontWeight: '400',
  },
  detailsMine: {
    color: '#E0F2FE',
  },
  detailsTheirs: {
    color: '#64748B',
  },
});
