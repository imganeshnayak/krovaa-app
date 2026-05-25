import { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

interface SendMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (recipientUserCode: string, amount: number, description: string) => Promise<{ error: string | null }>;
  balance: number;
}

export function SendMoneyModal({ visible, onClose, onSend, balance }: SendMoneyModalProps) {
  const [recipientUserCode, setRecipientUserCode] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);

    if (!recipientUserCode.trim()) {
      setError('Please enter recipient user code');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const result = await onSend(recipientUserCode.trim().toUpperCase(), amountNum, description.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setRecipientUserCode('');
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
    setRecipientUserCode('');
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
              <Text style={styles.headerTitle}>Send Money</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>

              <Input
                label="Recipient User Code"
                placeholder="Enter user code (e.g., KROVA123)"
                value={recipientUserCode}
                onChangeText={setRecipientUserCode}
                autoCapitalize="words"
              />

              <Input
                label="Amount (₹)"
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
                title="Send Money"
                onPress={handleSend}
                loading={loading}
                disabled={loading}
                style={styles.sendButton}
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
  balanceInfo: {
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontWeight: FontWeights.medium as any,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  sendButton: {
    marginTop: Spacing.md,
  },
});
