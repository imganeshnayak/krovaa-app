import { View, Text, Modal, StyleSheet, TouchableOpacity, Clipboard } from 'react-native';
import { X, Copy, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

interface ReceiveMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  userCode: string;
  fullName: string;
}

export function ReceiveMoneyModal({ visible, onClose, userCode, fullName }: ReceiveMoneyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.backdrop} onTouchStart={onClose}>
          <View style={styles.modalContent} onTouchStart={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Receive Money</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Share your user code to receive payments</Text>
                
                <View style={styles.userCodeContainer}>
                  <Text style={styles.userCode}>{userCode}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                    {copied ? (
                      <Check size={20} color={Colors.secondary} />
                    ) : (
                      <Copy size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.copiedText}>{copied ? 'Copied to clipboard!' : 'Tap to copy'}</Text>
              </View>

              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>How it works</Text>
                <Text style={styles.instructionsText}>
                  1. Share your user code with the sender
                </Text>
                <Text style={styles.instructionsText}>
                  2. They enter your code in the Send Money form
                </Text>
                <Text style={styles.instructionsText}>
                  3. Money is transferred instantly to your wallet
                </Text>
              </View>

              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Account Name</Text>
                <Text style={styles.accountName}>{fullName}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: Spacing.lg,
  },
  infoCard: {
    backgroundColor: Colors.gray50,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  userCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: Spacing.sm,
  },
  userCode: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.primary,
    letterSpacing: 2,
    flex: 1,
    textAlign: 'center',
  },
  copyButton: {
    padding: Spacing.sm,
  },
  copiedText: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    fontWeight: FontWeights.medium as any,
  },
  instructionsCard: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  instructionsText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.sm,
  },
  accountInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  accountLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginBottom: 4,
  },
  accountName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray900,
  },
});
