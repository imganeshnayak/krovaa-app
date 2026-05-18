import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, Plus, TrendingUp, Clock } from 'lucide-react-native';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const TRANSACTIONS = [
  { id: '1', type: 'incoming', label: 'Payment from Sarah Johnson', amount: '+₹250.00', date: 'Today, 2:30 PM', status: 'completed' },
  { id: '2', type: 'outgoing', label: 'Escrow for Logo Design', amount: '-₹150.00', date: 'Today, 11:00 AM', status: 'pending' },
  { id: '3', type: 'incoming', label: 'Payment from Mike Chen', amount: '+₹500.00', date: 'Yesterday', status: 'completed' },
  { id: '4', type: 'outgoing', label: 'Platform Fee', amount: '-₹25.00', date: 'Yesterday', status: 'completed' },
  { id: '5', type: 'incoming', label: 'Payment from Emily Davis', amount: '+₹320.00', date: 'May 4', status: 'completed' },
];

export default function WalletScreen() {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wallet</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹2,895.00</Text>
          <Text style={styles.pendingText}>
            <Clock size={12} color={Colors.warning} /> ₹150.00 pending
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
                <ArrowUpRight size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionLabel}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.secondary }]}>
                <ArrowDownLeft size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionLabel}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
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

          {TRANSACTIONS.map((tx) => (
            <View key={tx.id} style={styles.transactionItem}>
              <View style={[
                styles.txIcon,
                { backgroundColor: tx.type === 'incoming' ? '#E6F9EE' : '#FFF0EB' }
              ]}>
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
                <Text style={[
                  styles.txAmount,
                  { color: tx.type === 'incoming' ? Colors.secondary : Colors.gray900 }
                ]}>
                  {tx.amount}
                </Text>
                {tx.status === 'pending' && (
                  <Text style={styles.txPending}>Pending</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
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
});
