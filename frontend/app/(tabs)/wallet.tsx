import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, Plus, Clock } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getWalletData, sendMoney, topUpWallet, type WalletData, type Transaction } from '@/lib/walletApi';
import { SendMoneyModal } from '@/components/SendMoneyModal';
import { ReceiveMoneyModal } from '@/components/ReceiveMoneyModal';
import { TopUpModal } from '@/components/TopUpModal';

const CURRENCY = '₹';

export default function WalletScreen() {
  const { session, user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);

  const fetchWalletData = async () => {
    if (!session?.access_token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getWalletData(session.access_token);
      if (result.error) {
        setError(result.error);
        setWallet(null);
      } else {
        setWallet(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      if (wallet) {
        fetchWalletData();
      }
    }, [wallet?.earned])
  );

  const handleSend = async (recipientUserCode: string, amount: number, description: string) => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' };
    }
    return await sendMoney(session.access_token, recipientUserCode, amount, description);
  };

  const handleTopUp = async (amount: number, description: string) => {
    if (!session?.access_token) {
      return { error: 'Not authenticated' };
    }
    return await topUpWallet(session.access_token, amount, description);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !wallet) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error || 'Failed to load wallet'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWalletData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatCurrency = (value: number) => {
    return `${CURRENCY}${value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wallet</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(wallet.balance)}</Text>
          {wallet.pending > 0 && (
            <Text style={styles.pendingText}>
              <Clock size={12} color={Colors.warning} /> {formatCurrency(wallet.pending)} pending
            </Text>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => setSendModalVisible(true)}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
                <ArrowUpRight size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionLabel}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => setReceiveModalVisible(true)}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.secondary }]}>
                <ArrowDownLeft size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionLabel}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={() => setTopUpModalVisible(true)}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.accent }]}>
                <Plus size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionLabel}>Top Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {wallet.transactions && wallet.transactions.length > 0 ? (
            wallet.transactions.map((tx: Transaction) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: tx.type === 'incoming' ? '#E6F9EE' : '#FFF0EB' },
                  ]}
                >
                  {tx.type === 'incoming' ? (
                    <ArrowDownLeft size={18} color={Colors.secondary} />
                  ) : (
                    <ArrowUpRight size={18} color={Colors.accent} />
                  )}
                </View>
                <View style={styles.txContent}>
                  <Text style={styles.txLabel}>{tx.label}</Text>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'incoming' ? Colors.secondary : Colors.gray900 },
                    ]}
                  >
                    {tx.type === 'incoming' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                  {tx.status === 'pending' && <Text style={styles.txPending}>Pending</Text>}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SendMoneyModal
        visible={sendModalVisible}
        onClose={() => setSendModalVisible(false)}
        onSend={handleSend}
        balance={wallet.balance}
      />

      <ReceiveMoneyModal
        visible={receiveModalVisible}
        onClose={() => setReceiveModalVisible(false)}
        userCode={user?.userCode || ''}
        fullName={user?.fullName || 'User'}
      />

      <TopUpModal
        visible={topUpModalVisible}
        onClose={() => setTopUpModalVisible(false)}
        onTopUp={handleTopUp}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.extraBold as any,
    color: Colors.gray900,
  },
  balanceCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeights.medium as any,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.extraBold as any,
    color: Colors.white,
    marginBottom: 4,
  },
  pendingText: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
    fontWeight: FontWeights.medium as any,
    marginBottom: Spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    fontWeight: FontWeights.medium as any,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semiBold as any,
    color: Colors.gray900,
  },
  seeAllText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium as any,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  txContent: {
    flex: 1,
  },
  txLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray900,
    marginBottom: 2,
  },
  txDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semiBold as any,
    marginBottom: 2,
  },
  txPending: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: FontWeights.medium as any,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    color: Colors.gray500,
    fontWeight: FontWeights.medium as any,
  },
});

