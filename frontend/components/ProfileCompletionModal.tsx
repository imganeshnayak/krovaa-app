import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import {
  Briefcase,
  Phone,
  User as UserIcon,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Code,
  Palette,
  Hammer,
  GanttChart,
  UserSquare2,
  HelpCircle,
  GraduationCap,
  Users,
  Target,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getCurrentUserProfile, updateUserProfile, type UserProfile } from '@/lib/profileApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CATEGORIES = [
  { id: 'tech',         label: 'Tech',         icon: Code,        color: '#0066FF', bg: '#0066FF10', border: '#0066FF30' },
  { id: 'creative',     label: 'Creative',     icon: Palette,     color: '#9C27B0', bg: '#9C27B010', border: '#9C27B030' },
  { id: 'engineering',  label: 'Engineering',  icon: Hammer,      color: '#FF9800', bg: '#FF980010', border: '#FF980030' },
  { id: 'professional', label: 'Professional', icon: GanttChart,  color: '#4CAF50', bg: '#4CAF5010', border: '#4CAF5030' },
  { id: 'freelancer',   label: 'Freelancer',   icon: Users,       color: '#E91E63', bg: '#E91E6310', border: '#E91E6330' },
  { id: 'student',      label: 'Student',      icon: GraduationCap,color: '#00BCD4', bg: '#00BCD410', border: '#00BCD430' },
  { id: 'none',         label: 'None',         icon: UserSquare2,  color: '#3F51B5', bg: '#3F51B510', border: '#3F51B530' },
  { id: 'other',        label: 'Other',        icon: HelpCircle,  color: '#607D8B', bg: '#607D8B10', border: '#607D8B30' },
];

const SUB_PROFESSIONS: Record<string, string[]> = {
  tech:         ['Software Developer', 'Web Developer', 'Data Scientist', 'AI / ML Engineer', 'Cybersecurity Analyst', 'DevOps Engineer', 'Mobile App Developer'],
  creative:     ['UI/UX Designer', 'Graphic Designer', '3D Designer', '2D Designer', 'Content Creator', 'Video Editor', 'Photographer', 'Videographer', 'Artist / Illustrator', 'Musician'],
  engineering:  ['Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Architect', 'Structural Engineer'],
  professional: ['Product Manager', 'Digital Marketer', 'Doctor', 'Nurse', 'Pharmacist', 'Lawyer', 'Chartered Accountant', 'Teacher / Educator', 'Consultant'],
};

const calculateAge = (dob: string) => {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const md = today.getMonth() - birthDate.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : null;
};

// ─── Inline Calendar Picker ──────────────────────────────────────────────────

interface InlineDatePickerProps {
  value: string;
  onChange: (val: string) => void;
}

function InlineDatePicker({ value, onChange }: InlineDatePickerProps) {
  const today = new Date();

  const parseSelected = (): Date | null => {
    if (!value) return null;
    const parts = value.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? null : d;
  };

  const selected = parseSelected();

  const initYear  = selected ? selected.getFullYear()  : today.getFullYear() - 22;
  const initMonth = selected ? selected.getMonth()      : today.getMonth();

  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const years: number[] = [];
  for (let y = 1940; y <= today.getFullYear(); y++) years.push(y);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev      = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; type: 'prev' | 'cur' | 'next' }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ day: daysInPrev - firstDayOfMonth + 1 + i, type: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'cur' });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, type: 'next' });
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    const limit = today.getFullYear() * 12 + today.getMonth();
    const cur   = viewYear * 12 + viewMonth;
    if (cur >= limit) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d > today) return;
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  const formatDisplay = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const isSelected = (day: number) =>
    selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth()    === viewMonth &&
    selected.getDate()     === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth()    === viewMonth &&
    today.getDate()     === day;

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={prevMonth}
          style={styles.calendarArrow}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={16} color={Colors.gray700} />
        </TouchableOpacity>

        <View style={styles.calendarSelectors}>
          {/* Month selector dropdown */}
          <View style={{ relative: 'true' } as any}>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => {
                setShowMonthDropdown(!showMonthDropdown);
                setShowYearDropdown(false);
              }}
            >
              <Text style={styles.selectorText}>{MONTHS[viewMonth]}</Text>
              <ChevronDown size={11} color={Colors.gray500} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {/* Year selector dropdown */}
          <View style={{ relative: 'true' } as any}>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => {
                setShowYearDropdown(!showYearDropdown);
                setShowMonthDropdown(false);
              }}
            >
              <Text style={styles.selectorText}>{viewYear}</Text>
              <ChevronDown size={11} color={Colors.gray500} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={nextMonth}
          disabled={viewYear * 12 + viewMonth >= today.getFullYear() * 12 + today.getMonth()}
          style={[
            styles.calendarArrow,
            viewYear * 12 + viewMonth >= today.getFullYear() * 12 + today.getMonth() && { opacity: 0.25 }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={16} color={Colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Month Dropdown List Overlay */}
      {showMonthDropdown && (
        <View style={styles.dropdownListContainer}>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                style={[styles.dropdownItem, viewMonth === i && styles.dropdownItemActive]}
                onPress={() => {
                  setViewMonth(i);
                  setShowMonthDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, viewMonth === i && styles.dropdownItemTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Year Dropdown List Overlay */}
      {showYearDropdown && (
        <View style={styles.dropdownListContainer}>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {years.slice().reverse().map(y => (
              <TouchableOpacity
                key={y}
                style={[styles.dropdownItem, viewYear === y && styles.dropdownItemActive]}
                onPress={() => {
                  setViewYear(y);
                  setShowYearDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, viewYear === y && styles.dropdownItemTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Weekday Grid */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={styles.weekdayText}>{d}</Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {cells.map((cell, idx) => {
          const muted   = cell.type !== 'cur';
          const future  = !muted && (new Date(viewYear, viewMonth, cell.day) > today);
          const sel     = !muted && isSelected(cell.day);
          const todayMark = !muted && isToday(cell.day);

          return (
            <TouchableOpacity
              key={idx}
              disabled={muted || future}
              onPress={() => !muted && !future && selectDay(cell.day)}
              style={[
                styles.dayCell,
                sel && styles.dayCellSelected,
                todayMark && !sel && styles.dayCellToday,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  muted && styles.dayTextMuted,
                  future && styles.dayTextMuted,
                  sel && styles.dayTextSelected,
                  todayMark && !sel && styles.dayTextToday,
                ]}
              >
                {cell.day}
              </Text>
              {todayMark && !sel && (
                <View style={styles.todayIndicatorDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected DOB Indicator Banner */}
      <View style={[styles.calendarBanner, selected ? styles.calendarBannerActive : styles.calendarBannerNeutral]}>
        <CalendarIcon size={14} color={selected ? Colors.primary : Colors.gray500} style={{ marginRight: Spacing.sm }} />
        <View style={{ flex: 1 }}>
          {selected ? (
            <Text style={styles.bannerActiveText}>{formatDisplay(selected)}</Text>
          ) : (
            <Text style={styles.bannerNeutralText}>Select your date of birth</Text>
          )}
        </View>
        {selected && (() => {
          const age = calculateAge(value);
          return age !== null ? (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{age} yrs</Text>
            </View>
          ) : null;
        })()}
      </View>
    </View>
  );
}

// ─── Main Component Orchestrator ───────────────────────────────────────────────

export default function ProfileCompletionModal() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    userGoal: '',
    category: '',
    profession: '',
    customProfession: '',
    bio: '',
  });

  // 1. Fetch backend profile on mount
  useEffect(() => {
    let active = true;

    async function loadUserProfile() {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      // Bypass for local dev quick-mock sessions to keep UI interactive
      if (session.access_token === 'dev-token') {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await getCurrentUserProfile(session.access_token);
        if (active && data?.user) {
          setProfile(data.user);
          const needsSetup = !data.user.profession || data.user.profession === 'none' || data.user.profession === 'None';
          setIsVisible(needsSetup);
          
          // Pre-fill whatever fields exist
          setFormData(prev => ({
            ...prev,
            displayName: data.user.fullName || '',
            phoneNumber: data.user.phoneNumber ? data.user.phoneNumber.replace('+91', '') : '',
            gender: data.user.gender || '',
            userGoal: data.user.userGoal || '',
            bio: data.user.bio || '',
          }));
        }
      } catch (err) {
        // Silent catch
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUserProfile();

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  if (loading || !isVisible || !session?.access_token) return null;

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const isIndianPhoneValid = /^[6-9]\d{9}$/.test(formData.phoneNumber);

  const isStepDisabled = () => {
    if (step === 1) {
      return !formData.userGoal;
    }
    if (step === 2) {
      return (
        !formData.displayName.trim() ||
        !isIndianPhoneValid ||
        !formData.gender ||
        !formData.dateOfBirth ||
        calculateAge(formData.dateOfBirth) === null
      );
    }
    if (step === 3) {
      const { category, profession, customProfession } = formData;
      if (!category) return true;
      if (category === 'none' || category === 'freelancer' || category === 'student' || category === 'other') {
        if (category === 'other' && !customProfession.trim()) return true;
        return false;
      }
      // Categories with sub-professions
      if (!profession) return true;
      if (profession === 'Other' && !customProfession.trim()) return true;
      return false;
    }
    return false;
  };

  const handleSubmit = async () => {
    let finalProfession = formData.profession;
    if (formData.category === 'none')       finalProfession = 'none';
    if (formData.category === 'freelancer') finalProfession = 'freelancer';
    if (formData.category === 'student')    finalProfession = 'student';
    if (formData.category === 'other' || formData.profession === 'Other') {
      finalProfession = formData.customProfession.trim() || 'other';
    }

    if (!finalProfession) {
      Alert.alert('Incomplete Profile', 'Please select or specify your profession.');
      return;
    }

    const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
    if (!age) {
      Alert.alert('Incomplete Profile', 'Please select a valid date of birth.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await updateUserProfile(session.access_token, {
        fullName: formData.displayName.trim(),
        phoneNumber: formData.phoneNumber.startsWith('+91') ? formData.phoneNumber : `+91${formData.phoneNumber}`,
        gender: formData.gender,
        age,
        profession: finalProfession as any,
        userGoal: formData.userGoal as any,
        bio: formData.bio.trim(),
      });

      if (error) {
        Alert.alert('Setup Failed', error);
      } else if (data) {
        Alert.alert('Success', 'Profile completed! Welcome to Krovaa.');
        setIsVisible(false);
      }
    } catch (err) {
      Alert.alert('Setup Failed', 'An unexpected error occurred during profile setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepMeta = [
    { icon: Target, title: 'Start Your Journey', desc: 'What brings you to Krovaa today?' },
    { icon: UserIcon, title: 'Personal Presence', desc: 'Help us get to know you better.' },
    { icon: Briefcase, title: 'Identity Alignment', desc: 'Tell us about your skills and expertise.' },
    { icon: Sparkles, title: 'Final Details', desc: 'A small blueprint overview goes a long way.' },
  ];

  const meta = stepMeta[step - 1];
  const StepIconComponent = meta.icon;

  const currentCategoryObj = CATEGORIES.find(c => c.id === formData.category);
  const showSubCategories = formData.category && SUB_PROFESSIONS[formData.category];
  const showCustomProfessionInput =
    formData.category === 'other' || formData.profession === 'Other';

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Top Progress Indicator Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(step / 4) * 100}%` }]} />
          </View>

          {/* Step Header Context */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIconWrapper}>
              <StepIconComponent size={18} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>{meta.title}</Text>
            <Text style={styles.headerSubtitle}>{meta.desc}</Text>
          </View>

          {/* Scrollable Form Content */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* STEP 1: GOAL SELECTION */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <Text style={styles.fieldLabel}>I WANT TO...</Text>
                
                <TouchableOpacity
                  style={[
                    styles.goalCard,
                    formData.userGoal === 'OFFER_SERVICE' && styles.goalCardActiveOffer,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setFormData({ ...formData, userGoal: 'OFFER_SERVICE' })}
                >
                  <View style={[
                    styles.goalIconBox,
                    formData.userGoal === 'OFFER_SERVICE' ? styles.goalIconBoxActiveOffer : styles.goalIconBoxNeutral
                  ]}>
                    <Briefcase size={18} color={formData.userGoal === 'OFFER_SERVICE' ? Colors.white : Colors.gray600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, formData.userGoal === 'OFFER_SERVICE' && styles.goalTitleActive]}>
                      Offer my services
                    </Text>
                    <Text style={styles.goalDesc}>I'm here to work and earn</Text>
                  </View>
                  {formData.userGoal === 'OFFER_SERVICE' && (
                    <CheckCircle size={18} color={Colors.primary} style={{ marginLeft: Spacing.sm }} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalCard,
                    formData.userGoal === 'HIRE_PROFESSIONALS' && styles.goalCardActiveHire,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setFormData({ ...formData, userGoal: 'HIRE_PROFESSIONALS' })}
                >
                  <View style={[
                    styles.goalIconBox,
                    formData.userGoal === 'HIRE_PROFESSIONALS' ? styles.goalIconBoxActiveHire : styles.goalIconBoxNeutral
                  ]}>
                    <Target size={18} color={formData.userGoal === 'HIRE_PROFESSIONALS' ? Colors.white : Colors.gray600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, formData.userGoal === 'HIRE_PROFESSIONALS' && styles.goalTitleActive]}>
                      Hire professionals
                    </Text>
                    <Text style={styles.goalDesc}>I'm looking for talent for my projects</Text>
                  </View>
                  {formData.userGoal === 'HIRE_PROFESSIONALS' && (
                    <CheckCircle size={18} color={Colors.success} style={{ marginLeft: Spacing.sm }} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: PERSONAL INFO */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                {/* Display Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
                  <View style={styles.textInputWrapper}>
                    <UserIcon size={14} color={Colors.gray500} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your full name"
                      placeholderTextColor={Colors.gray500}
                      value={formData.displayName}
                      onChangeText={text => setFormData({ ...formData, displayName: text })}
                    />
                  </View>
                </View>

                {/* Indian Phone Number */}
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldLabel}>PHONE NUMBER (INDIA)</Text>
                  <View style={styles.textInputWrapper}>
                    <Text style={styles.phonePrefix}>+91</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="98765 43210"
                      placeholderTextColor={Colors.gray500}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={formData.phoneNumber}
                      onChangeText={text => setFormData({ ...formData, phoneNumber: text.replace(/\D/g, '') })}
                    />
                    {isIndianPhoneValid && (
                      <CheckCircle size={14} color={Colors.success} style={{ marginRight: Spacing.sm }} />
                    )}
                  </View>
                </View>

                {/* Gender Pill Selectors */}
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldLabel}>GENDER</Text>
                  <View style={styles.genderPillsContainer}>
                    {['Male', 'Female', 'Other'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderPill,
                          formData.gender === g && styles.genderPillActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setFormData({ ...formData, gender: g })}
                      >
                        <Text style={[styles.genderPillText, formData.gender === g && styles.genderPillTextActive]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Date of Birth Custom Picker */}
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
                  <InlineDatePicker
                    value={formData.dateOfBirth}
                    onChange={val => setFormData({ ...formData, dateOfBirth: val })}
                  />
                </View>
              </View>
            )}

            {/* STEP 3: PROFESSION SELECTION */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                {/* Choose Category Grid */}
                <Text style={styles.fieldLabel}>CHOOSE CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    const isActive = formData.category === cat.id;

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.8}
                        onPress={() =>
                          setFormData({ ...formData, category: cat.id, profession: '', customProfession: '' })
                        }
                        style={[
                          styles.categoryCard,
                          isActive && {
                            backgroundColor: cat.bg,
                            borderColor: cat.color,
                            borderWidth: 1.5,
                          },
                        ]}
                      >
                        <View style={[styles.categoryIconBox, { backgroundColor: cat.bg }]}>
                          <CatIcon size={16} color={cat.color} />
                        </View>
                        <Text style={[styles.categoryLabel, isActive && { color: Colors.gray900, fontWeight: '700' }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Select Specific Sub-Profession Pills */}
                {showSubCategories && (
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.fieldLabel}>SELECT PROFESSION</Text>
                    <View style={styles.pillsWrapper}>
                      {SUB_PROFESSIONS[formData.category].map(prof => (
                        <TouchableOpacity
                          key={prof}
                          activeOpacity={0.8}
                          onPress={() => setFormData({ ...formData, profession: prof })}
                          style={[
                            styles.professionPill,
                            formData.profession === prof && styles.professionPillActive,
                          ]}
                        >
                          <Text style={[styles.professionPillText, formData.profession === prof && styles.professionPillTextActive]}>
                            {prof}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setFormData({ ...formData, profession: 'Other' })}
                        style={[
                          styles.professionPill,
                          formData.profession === 'Other' && styles.professionPillActive,
                        ]}
                      >
                        <Text style={[styles.professionPillText, formData.profession === 'Other' && styles.professionPillTextActive]}>
                          Other...
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Specify custom write-in profession input */}
                {showCustomProfessionInput && (
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.fieldLabel}>SPECIFY PROFESSION</Text>
                    <View style={styles.textInputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Type your skill / profession..."
                        placeholderTextColor={Colors.gray500}
                        value={formData.customProfession}
                        onChangeText={text => setFormData({ ...formData, customProfession: text })}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* STEP 4: BIO DETAILS */}
            {step === 4 && (
              <View style={styles.stepContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldLabel}>SHORT BIO (OPTIONAL)</Text>
                  <TextInput
                    style={styles.bioTextArea}
                    placeholder="Describe your skills, goals, or experience. Tell Krovaa what makes you unique..."
                    placeholderTextColor={Colors.gray500}
                    multiline
                    numberOfLines={4}
                    value={formData.bio}
                    onChangeText={text => setFormData({ ...formData, bio: text })}
                  />
                  <Text style={styles.bioHelperText}>Let others know what kind of projects you want to work on.</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Fixed Navigation Actions Area */}
          <View style={styles.modalFooter}>
            <View style={styles.footerButtonsRow}>
              {step > 1 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={16} color={Colors.gray600} style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {step < 4 ? (
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    isStepDisabled() && styles.continueButtonDisabled,
                  ]}
                  disabled={isStepDisabled()}
                  onPress={handleNext}
                >
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <ArrowRight size={16} color={Colors.white} style={{ marginLeft: Spacing.xs }} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    isSubmitting && { opacity: 0.8 },
                  ]}
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                >
                  {isSubmitting ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: Spacing.sm }} />
                      <Text style={styles.continueButtonText}>Completing...</Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <CheckCircle size={16} color={Colors.white} style={{ marginRight: Spacing.sm }} />
                      <Text style={styles.continueButtonText}>Finish Setup</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Stepper Dots Indicators */}
            <View style={styles.stepperDotsRow}>
              {[1, 2, 3, 4].map(s => (
                <View
                  key={s}
                  style={[
                    styles.stepperDot,
                    step === s ? styles.stepperDotActive : styles.stepperDotInactive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '90%',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.gray100,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0066FF10',
    borderColor: '#0066FF20',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: 4,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  stepContainer: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray600,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  // STEP 1 Goal Styles
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  goalCardActiveOffer: {
    backgroundColor: '#0066FF05',
    borderColor: '#0066FF60',
    borderWidth: 1.5,
  },
  goalCardActiveHire: {
    backgroundColor: '#00B34105',
    borderColor: '#00B34160',
    borderWidth: 1.5,
  },
  goalIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  goalIconBoxNeutral: {
    backgroundColor: Colors.gray200,
  },
  goalIconBoxActiveOffer: {
    backgroundColor: Colors.primary,
  },
  goalIconBoxActiveHire: {
    backgroundColor: Colors.success,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray800,
  },
  goalTitleActive: {
    color: Colors.gray900,
  },
  goalDesc: {
    fontSize: 11,
    color: Colors.gray500,
    marginTop: 2,
  },
  // STEP 2 Personal Info Styles
  inputContainer: {
    marginBottom: Spacing.md,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    height: 48,
    paddingHorizontal: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  phonePrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray600,
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray900,
    height: '100%',
  },
  genderPillsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderPill: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderPillActive: {
    borderColor: Colors.primary,
    backgroundColor: '#0066FF10',
    borderWidth: 1.5,
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray700,
  },
  genderPillTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.bold as any,
  },
  // Calendar Inline styles
  calendarContainer: {
    backgroundColor: Colors.white,
    borderColor: Colors.gray200,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between' as any,
    marginBottom: Spacing.sm,
  },
  calendarArrow: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarSelectors: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
    flex: 1,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectorText: {
    fontSize: 11,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  dropdownListContainer: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    top: 40,
    backgroundColor: Colors.white,
    borderColor: Colors.gray300,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    zIndex: 10,
    maxHeight: 160,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray100,
  },
  dropdownItemActive: {
    backgroundColor: '#0066FF10',
  },
  dropdownItemText: {
    fontSize: 12,
    color: Colors.gray800,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray500,
    width: 28,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gapVertical: 2,
  } as any,
  dayCell: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    backgroundColor: '#0066FF10',
  },
  dayText: {
    fontSize: 11,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray900,
  },
  dayTextMuted: {
    color: Colors.gray300,
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  todayIndicatorDot: {
    width: 3,
    height: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 2,
  },
  calendarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  calendarBannerActive: {
    backgroundColor: '#0066FF05',
    borderColor: '#0066FF20',
  },
  calendarBannerNeutral: {
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
  },
  bannerActiveText: {
    fontSize: 12,
    fontWeight: FontWeights.bold as any,
    color: Colors.gray900,
  },
  bannerNeutralText: {
    fontSize: 11,
    color: Colors.gray400,
  },
  ageBadge: {
    backgroundColor: '#0066FF15',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ageBadgeText: {
    fontSize: 10,
    fontWeight: FontWeights.bold as any,
    color: Colors.primary,
  },
  // STEP 3 Category Selection Styles
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 8,
    marginBottom: Spacing.xs,
  },
  categoryIconBox: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
    flex: 1,
  },
  pillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  professionPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray300,
    backgroundColor: Colors.gray50,
  },
  professionPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  professionPillText: {
    fontSize: 11,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray800,
  },
  professionPillTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  // STEP 4 Bio Styles
  bioTextArea: {
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    height: 100,
    fontSize: 13,
    color: Colors.gray900,
    textAlignVertical: 'top',
  },
  bioHelperText: {
    fontSize: 10,
    color: Colors.gray400,
    marginTop: Spacing.xs,
    marginLeft: 4,
  },
  // Footer navigation
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: FontWeights.medium as any,
    color: Colors.gray700,
  },
  continueButton: {
    flex: 2,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  continueButtonText: {
    fontSize: 13,
    fontWeight: FontWeights.bold as any,
    color: Colors.white,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  stepperDot: {
    height: 4,
    borderRadius: 2,
  },
  stepperDotActive: {
    width: 16,
    backgroundColor: Colors.primary,
  },
  stepperDotInactive: {
    width: 4,
    backgroundColor: Colors.gray200,
  },
});
