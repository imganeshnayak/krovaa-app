import { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

interface TopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onTopUp: (amount: number, description: string) => Promise<{ error: string | null }>;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export function TopUpModal({ visible, onClose, onTopUp }: TopUpModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(String(quickAmount));
  };

  const handleTopUp = async () => {
    setError(null);

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum < 1) {
      setError('Minimum top up amount is ₹1');
      return;
    }

    setLoading(true);
    try {
      const result = await onTopUp(amountNum, description.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setAmount('');
        setDescription('');
        setError(null);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop} onTouchStart={handleClose}>
          <View style={styles.modalContent} onTouchStart={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={styles.quickAmountLabel}>Quick Amounts</Text>
              <View style={styles.quickAmounts}>
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      styles.quickAmountButton,
                      amount === String(quickAmount) && styles.quickAmountButtonActive,
                    ]}
                    onPress={() => handleQuickAmount(quickAmount)}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        amount === String(quickAmount) && styles.quickAmountTextActive,
                      ]}
                    >
                      ₹{quickAmount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Custom Amount (₹)"
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="default"
              />

              <Input
                label="Description (Optional)"
                placeholder="What's this for?"
                value={description}
                onChangeText={setDescription}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title="Top Up"
                onPress={handleTopUp}
                loading={loading}
                disabled={loading}
                style={styles.topUpButton}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
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
  scrollContent: {
    padding: Spacing.lg,
  },
  quickAmountLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray700,
    marginBottom: Spacing.md,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickAmountButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  quickAmountButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickAmountText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray900,
  },
  quickAmountTextActive: {
    color: Colors.white,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  topUpButton: {
    marginTop: Spacing.md,
  },
});
