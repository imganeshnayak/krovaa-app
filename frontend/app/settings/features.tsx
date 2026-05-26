import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, LayoutAnimation, Platform, UIManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontWeights, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

const FEATURE_STORAGE_KEY = 'krovaa.features.ai-image-generator';
const DAILY_LIMIT = 5;

export default function FeaturesScreen() {
  const [imageGeneratorEnabled, setImageGeneratorEnabled] = useState(true);
  const [generatedToday] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFeatureState() {
      try {
        const stored = await AsyncStorage.getItem(FEATURE_STORAGE_KEY);
        if (stored === null) {
          return;
        }

        if (mounted) {
          setImageGeneratorEnabled(stored === 'true');
        }
      } catch {
        // keep default state
      }
    }

    loadFeatureState();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleImageGenerator = async (enabled: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setImageGeneratorEnabled(enabled);
    await AsyncStorage.setItem(FEATURE_STORAGE_KEY, String(enabled));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Features</Text>
        <Text style={styles.headerSubtitle}>Manage experimental features for your account.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.featureCard}>
          <View style={styles.featureTopRow}>
            <View style={styles.featureTitleWrap}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureIcon}
              >
                <Sparkles size={22} color={Colors.white} />
              </LinearGradient>

              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>KrovAI Image Generator</Text>
                <Text style={styles.featureSubtitle}>Generate images from text description using AI</Text>
              </View>
            </View>

            <Switch
              value={imageGeneratorEnabled}
              onValueChange={toggleImageGenerator}
              trackColor={{ false: Colors.gray200, true: '#8B5CF655' }}
              thumbColor={imageGeneratorEnabled ? '#0EA5E9' : Colors.gray400}
            />
          </View>

          <LinearGradient
            colors={['#F5ECFF', '#F8F2FF', '#FBF8FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.limitCard}
          >
            <View style={styles.limitHeaderRow}>
              <Text style={styles.limitTitle}>Daily Generation Limit</Text>
              <Text style={styles.dailyCount}>{generatedToday} / {DAILY_LIMIT}</Text>
            </View>

            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Images generated today:</Text>
              <Text style={styles.limitValue}>{generatedToday} / {DAILY_LIMIT}</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((generatedToday / DAILY_LIMIT) * 100, 100)}%` },
                ]}
              />
            </View>

            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Remaining:</Text>
              <Text style={styles.remainingValue}>{Math.max(DAILY_LIMIT - generatedToday, 0)} images</Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </ScrollView>
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
  headerSubtitle: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  section: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E1EF',
    shadowColor: Colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  featureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  featureTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.extraBold as any,
    color: '#111827',
  },
  featureSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  limitCard: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DFF8',
    padding: 16,
  },
  limitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitTitle: {
    fontSize: 15,
    fontWeight: FontWeights.extraBold as any,
    color: '#7C3AED',
  },
  dailyCount: {
    fontSize: 18,
    fontWeight: FontWeights.extraBold as any,
    color: '#111827',
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  limitLabel: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: FontWeights.medium as any,
    flexShrink: 1,
    paddingRight: Spacing.md,
  },
  limitValue: {
    fontSize: 15,
    fontWeight: FontWeights.extraBold as any,
    color: '#111827',
    textAlign: 'right',
    minWidth: 56,
  },
  progressTrack: {
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E9D5FF',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: '#C084FC',
  },
  remainingValue: {
    fontSize: 15,
    fontWeight: FontWeights.extraBold as any,
    color: '#10B981',
    textAlign: 'right',
    minWidth: 72,
  },
});
