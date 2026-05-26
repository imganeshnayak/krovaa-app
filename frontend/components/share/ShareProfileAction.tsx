import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { CheckCircle2, Copy, Link2, QrCode, Share2, Sparkles, X } from 'lucide-react-native';
import { Colors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { attemptProfileShare, buildShareProfilePayload, copyProfileLink } from '@/lib/shareProfile';

type ShareProfileActionProps = {
  profileUrl: string;
  userName: string;
  userTitle?: string;
  launchMode?: 'native-first' | 'sheet-first';
  children: (args: { openShare: () => void; openSheet: () => void; isSharing: boolean }) => React.ReactNode;
};

const QR_SIZE = Math.min(Dimensions.get('window').width - 104, 220);

export default function ShareProfileAction({ profileUrl, userName, userTitle, launchMode = 'native-first', children }: ShareProfileActionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const copyAnim = useRef(new Animated.Value(0)).current;
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sharePayload = useMemo(
    () => buildShareProfilePayload({ profileUrl, userName, userTitle }),
    [profileUrl, userName, userTitle],
  );

  useEffect(() => {
    if (!sheetVisible) {
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.spring(sheetAnim, {
      toValue: 1,
      friction: 10,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [sheetVisible, sheetAnim]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    Animated.spring(copyAnim, {
      toValue: copyState === 'copied' ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 120,
    }).start();
  }, [copyAnim, copyState]);

  const openShare = async () => {
    if (isSharing) {
      return;
    }

    setIsSharing(true);
    try {
      const shareResult = await attemptProfileShare(sharePayload);
      if (shareResult === 'fallback') {
        setSheetVisible(true);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const openSheet = () => {
    setSheetVisible(true);
  };

  const closeSheet = () => setSheetVisible(false);

  const handleCopyLink = async () => {
    const copied = await copyProfileLink(sharePayload.url);
    if (!copied) {
      setSheetVisible(true);
      return;
    }

    setCopyState('copied');
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopyState('idle');
    }, 2000);
  };

  const handleTryShareAgain = async () => {
    await openShare();
  };

  const translateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDesktop ? 24 : 320, 0],
  });

  return (
    <>
      {children({ openShare, openSheet, isSharing })}

      <Modal transparent visible={sheetVisible} animationType="none" onRequestClose={closeSheet}>
        <View style={styles.overlayRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.overlayScrim} />

          <Animated.View
            style={[
              styles.sheet,
              isDesktop ? styles.sheetDesktop : styles.sheetMobile,
              {
                transform: [{ translateY }],
                opacity: sheetAnim,
                maxWidth: isDesktop ? 520 : undefined,
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.headerRow}>
              <View>
                <Text style={styles.sheetTitle}>Share Profile</Text>
                <Text style={styles.sheetSubtitle}>Send this profile by link or QR code.</Text>
              </View>
              <TouchableOpacity onPress={closeSheet} style={styles.closeButton} activeOpacity={0.75}>
                <X size={18} color={Colors.gray700} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>{userName.trim().slice(0, 1).toUpperCase() || 'U'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName} numberOfLines={1}>{userName}</Text>
                <Text style={styles.previewMeta} numberOfLines={2}>{userTitle || 'Professional profile'}</Text>
              </View>
              <View style={styles.previewBadge}>
                <Sparkles size={12} color={Colors.primary} />
                <Text style={styles.previewBadgeText}>Live</Text>
              </View>
            </View>

            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <View style={styles.qrHeaderIcon}>
                  <QrCode size={16} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.qrTitle}>Scan QR</Text>
                  <Text style={styles.qrSubtitle}>Open the profile instantly from another device.</Text>
                </View>
              </View>

              <View style={styles.qrFrame}>
                <QRCode value={sharePayload.url} size={QR_SIZE} backgroundColor="transparent" color={Colors.gray900} />
                <View style={styles.qrCenterMark}>
                  <Link2 size={18} color={Colors.white} />
                </View>
              </View>

              <Text style={styles.qrUrl} numberOfLines={2}>{sharePayload.url}</Text>
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyLink} activeOpacity={0.8}>
                {copyState === 'copied' ? (
                  <Animated.View style={styles.buttonInner}>
                    <Animated.View
                      style={{
                        opacity: copyAnim,
                        transform: [{
                          scale: copyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
                        }],
                      }}
                    >
                      <CheckCircle2 size={16} color="#16A34A" />
                    </Animated.View>
                    <Text style={styles.secondaryButtonSuccess}>Copied!</Text>
                  </Animated.View>
                ) : (
                  <View style={styles.buttonInner}>
                    <Copy size={16} color={Colors.gray700} />
                    <Text style={styles.secondaryButtonText}>Copy Link</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={handleTryShareAgain} activeOpacity={0.85}>
                <Share2 size={16} color={Colors.white} />
                <Text style={styles.primaryButtonText}>{launchMode === 'sheet-first' ? 'Share Now' : 'Try Share Again'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    width: '100%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  sheetMobile: {
    maxHeight: '92%',
  },
  sheetDesktop: {
    alignSelf: 'center',
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    marginBottom: 0,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.gray300,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  sheetSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold as any,
    color: Colors.primary,
  },
  previewName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  previewMeta: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary + '0E',
  },
  previewBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.primary,
  },
  qrCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  qrHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  qrSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  qrFrame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    paddingVertical: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  qrCenterMark: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  qrUrl: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray700,
  },
  secondaryButtonSuccess: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: '#16A34A',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
  },
});