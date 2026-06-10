/*
 * CasesScreen.tsx — Case Workspace management screen.
 *
 * PURPOSE: Lists all cases, handles CRUD, displays hearing dates & status badges,
 * and allows launching a creation modal to start a new case folder.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import Header from '../components/Header';
import useCaseStore, { CaseFolder, CaseStatus } from '../store/useCaseStore';
import { CaseType, CASE_TYPE_LABELS } from '../types/caseType';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cases'>;

export const STATUS_LABELS: Record<CaseStatus, string> = {
  consultation: 'Consultation',
  notice_sent: 'Notice Sent',
  filing: 'Filing',
  pending: 'Pending',
  evidence: 'Evidence',
  arguments: 'Arguments',
  disposed: 'Disposed',
};

export const STATUS_COLORS: Record<CaseStatus, string> = {
  consultation: '#3182CE',
  notice_sent: '#805AD5',
  filing: '#DD6B20',
  pending: '#D69E2E',
  evidence: '#38A169',
  arguments: '#E53E3E',
  disposed: '#718096',
};

const CASE_TYPES: CaseType[] = [
  'criminal',
  'civil',
  'consumer',
  'employment',
  'property',
  'family',
  'contract',
  'tax',
  'constitutional',
  'unknown',
];

const CASE_STATUSES: CaseStatus[] = [
  'consultation',
  'notice_sent',
  'filing',
  'pending',
  'evidence',
  'arguments',
  'disposed',
];

const CasesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const cases = useCaseStore((state) => state.cases);
  const addCase = useCaseStore((state) => state.addCase);
  const deleteCase = useCaseStore((state) => state.deleteCase);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [court, setCourt] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [clientName, setClientName] = useState('');
  const [caseType, setCaseType] = useState<CaseType>('unknown');
  const [status, setStatus] = useState<CaseStatus>('consultation');
  const [nextHearingDate, setNextHearingDate] = useState('');

  // Sort: Hearing Date (soonest first) -> then newly created first
  const sortedCases = [...cases].sort((a, b) => {
    if (a.nextHearingDate && b.nextHearingDate) {
      return a.nextHearingDate.localeCompare(b.nextHearingDate);
    }
    if (a.nextHearingDate) return -1;
    if (b.nextHearingDate) return 1;
    return b.createdAt - a.createdAt;
  });

  const handleCreateCase = () => {
    if (!title.trim() || !clientName.trim() || !court.trim()) {
      Alert.alert('Validation Error', 'Case Title, Client Name, and Court are required fields.');
      return;
    }

    // Validate hearing date format if entered
    if (nextHearingDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(nextHearingDate.trim())) {
      Alert.alert('Invalid Date Format', 'Please enter next hearing date as YYYY-MM-DD.');
      return;
    }

    addCase({
      title: title.trim(),
      caseNumber: caseNumber.trim(),
      court: court.trim(),
      judgeName: judgeName.trim() || undefined,
      clientName: clientName.trim(),
      caseType,
      status,
      nextHearingDate: nextHearingDate.trim() || undefined,
    });

    // Reset fields
    setTitle('');
    setCaseNumber('');
    setCourt('');
    setJudgeName('');
    setClientName('');
    setCaseType('unknown');
    setStatus('consultation');
    setNextHearingDate('');

    setModalVisible(false);
  };

  const handleDeleteCase = (c: CaseFolder) => {
    Alert.alert(
      'Delete Case Folder',
      `Are you sure you want to delete "${c.title}"? This will unlink all its documents from this folder.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCase(c.id),
        },
      ]
    );
  };

  const renderCaseItem = ({ item }: { item: CaseFolder }) => {
    const statusColor = STATUS_COLORS[item.status] || COLORS.textSecondary;
    const typeLabel = CASE_TYPE_LABELS[item.caseType] || 'General';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          navigation.navigate('CaseDetails', {
            caseId: item.id,
            caseTitle: item.title,
          });
        }}
        onLongPress={() => handleDeleteCase(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.caseNumber ? (
              <Text style={styles.cardNumber}>{item.caseNumber}</Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <Text style={styles.infoRow}>
            👤 Client: <Text style={styles.infoValue}>{item.clientName}</Text>
          </Text>
          <Text style={styles.infoRow}>
            🏛️ Court: <Text style={styles.infoValue}>{item.court}</Text>
          </Text>
          {item.judgeName ? (
            <Text style={styles.infoRow}>
              👨‍⚖️ Judge: <Text style={styles.infoValue}>{item.judgeName}</Text>
            </Text>
          ) : null}
          <Text style={styles.infoRow}>
            🏷️ Category: <Text style={styles.infoValue}>{typeLabel}</Text>
          </Text>
          <Text style={styles.infoRow}>
            📂 Documents: <Text style={styles.infoValue}>{item.documents.length}</Text>
          </Text>
        </View>

        {item.nextHearingDate ? (
          <View style={styles.hearingBanner}>
            <Text style={styles.hearingBannerText}>
              📅 Next Hearing: {item.nextHearingDate}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💼</Text>
      <Text style={styles.emptyTitle}>No cases found</Text>
      <Text style={styles.emptySubtitle}>
        Create your first case workspace to organize documents, track timelines, and generate strategy.
      </Text>
      <Text style={styles.emptyHint}>Tap the + button below to create a Case Folder</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Case Files"
        subtitle="Manage legal folders & timelines"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <FlatList
        data={sortedCases}
        renderItem={renderCaseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💼 New Case Folder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Case Title (Required)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. State vs Ramesh"
                  placeholderTextColor={COLORS.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Client Name (Required)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={COLORS.textMuted}
                  value={clientName}
                  onChangeText={setClientName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Court (Required)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. District Court, Bengaluru"
                  placeholderTextColor={COLORS.textMuted}
                  value={court}
                  onChangeText={setCourt}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Case Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. CC/123/2026"
                  placeholderTextColor={COLORS.textMuted}
                  value={caseNumber}
                  onChangeText={setCaseNumber}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Judge Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Justice Ramaswamy"
                  placeholderTextColor={COLORS.textMuted}
                  value={judgeName}
                  onChangeText={setJudgeName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Next Hearing Date (Optional, YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-06-30"
                  placeholderTextColor={COLORS.textMuted}
                  value={nextHearingDate}
                  onChangeText={setNextHearingDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Case Type Category</Text>
                <View style={styles.chipGrid}>
                  {CASE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        caseType === type && styles.activeChip,
                      ]}
                      onPress={() => setCaseType(type)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          caseType === type && styles.activeChipText,
                        ]}
                      >
                        {CASE_TYPE_LABELS[type] || 'General'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Initial Case Status</Text>
                <View style={styles.chipGrid}>
                  {CASE_STATUSES.map((stat) => (
                    <TouchableOpacity
                      key={stat}
                      style={[
                        styles.chip,
                        status === stat && {
                          backgroundColor: STATUS_COLORS[stat],
                          borderColor: STATUS_COLORS[stat],
                        },
                      ]}
                      onPress={() => setStatus(stat)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          status === stat && styles.activeChipText,
                        ]}
                      >
                        {STATUS_LABELS[stat]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.8}
                onPress={handleCreateCase}
              >
                <Text style={styles.submitButtonText}>Create Case Workspace</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  cardNumber: {
    fontSize: FONTS.small,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: FONTS.small,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  cardBody: {
    gap: SPACING.xs,
  },
  infoRow: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
  },
  hearingBanner: {
    backgroundColor: 'rgba(212, 168, 70, 0.15)',
    borderTopWidth: 1,
    borderColor: 'rgba(212, 168, 70, 0.3)',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: -SPACING.md,
    marginBottom: -SPACING.md,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
  },
  hearingBannerText: {
    fontSize: FONTS.caption,
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.heading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  emptyHint: {
    fontSize: FONTS.caption,
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: COLORS.background,
    fontWeight: FONTS.weightBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONTS.heading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    fontSize: FONTS.heading,
    color: COLORS.textSecondary,
    padding: SPACING.xs,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.textPrimary,
    padding: SPACING.sm,
    fontSize: FONTS.body,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
  },
  activeChipText: {
    color: COLORS.background,
    fontWeight: FONTS.weightBold,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
  },
});

export default CasesScreen;
