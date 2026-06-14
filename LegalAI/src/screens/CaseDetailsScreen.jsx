/*
 * CaseDetailsScreen.tsx — Workspace details and hub for a single case.
 *
 * PURPOSE: Displays all case details, handles inline updates for court metadata,
 * allows linking/unlinking document attachments, and provides entry points to case features.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';



import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import useDocumentStore from '../store/useDocumentStore';
import { CASE_TYPE_LABELS } from '../types/caseType';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { STATUS_LABELS, STATUS_COLORS } from './CasesScreen';




const CASE_STATUSES = [
'consultation',
'notice_sent',
'filing',
'pending',
'evidence',
'arguments',
'disposed'];


const CaseDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const updateCase = useCaseStore((state) => state.updateCase);
  const addDocumentToCase = useCaseStore((state) => state.addDocumentToCase);
  const removeDocumentFromCase = useCaseStore((state) => state.removeDocumentFromCase);

  const allDocuments = useDocumentStore((state) => state.documents);

  const [linkModalVisible, setLinkModalVisible] = useState(false);

  // Editable local state
  const [court, setCourt] = useState(caseObj?.court || '');
  const [judgeName, setJudgeName] = useState(caseObj?.judgeName || '');
  const [nextHearingDate, setNextHearingDate] = useState(caseObj?.nextHearingDate || '');

  if (!caseObj) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Case folder not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back to Cases</Text>
        </TouchableOpacity>
      </SafeAreaView>);

  }

  const handleUpdateField = (field, value) => {
    if (field === 'nextHearingDate' && value.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {

      // Just log warning, let them fix it or format it
    }updateCase(caseId, { [field]: value.trim() || undefined });
  };

  const handleStatusChange = (status) => {
    updateCase(caseId, { status });
  };

  // Find documents already linked
  const linkedDocs = allDocuments.filter((doc) => caseObj.documents.includes(doc.id));

  // Find documents available to link
  const availableDocs = allDocuments.filter((doc) => !caseObj.documents.includes(doc.id));

  const handleLinkDocument = (docId) => {
    addDocumentToCase(caseId, docId);
    setLinkModalVisible(false);
  };

  const handleUnlinkDocument = (docId, docName) => {
    Alert.alert(
      'Unlink Document',
      `Are you sure you want to remove "${docName}" from this case folder? The document itself will not be deleted.`,
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeDocumentFromCase(caseId, docId)
      }]

    );
  };

  const renderToolItem = (title, icon, enabled) => {
    return (
      <TouchableOpacity
        style={[styles.toolCard, !enabled && styles.toolCardDisabled]}
        activeOpacity={enabled ? 0.7 : 1}
        onPress={() => {
          if (enabled) {
            if (title === 'Timeline') {
              navigation.navigate('Timeline', { caseId: caseObj.id, caseTitle: caseObj.title });
            }
          } else {
            Alert.alert(
              'Feature Locked 🔒',
              `The ${title} tool is scheduled for future development.`,
              [{ text: 'OK' }]
            );
          }
        }}>
        
        <Text style={styles.toolIcon}>{icon}</Text>
        <Text style={styles.toolTitle}>{title}</Text>
      </TouchableOpacity>);

  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={caseObj.title}
        subtitle={`${CASE_TYPE_LABELS[caseObj.caseType] || 'General'} • ${caseObj.caseNumber || 'No number'}`}
        showBack={true}
        onBackPress={() => navigation.goBack()} />
      

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── CASE METADATA FORM ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Case Details</Text>

          <View style={styles.metaForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Name</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={caseObj.clientName}
                editable={false} />
              
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Court Location</Text>
              <TextInput
                style={styles.input}
                value={court}
                onChangeText={setCourt}
                onBlur={() => handleUpdateField('court', court)}
                placeholder="e.g. District Court, Bengaluru"
                placeholderTextColor={COLORS.textMuted} />
              
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Judge Assigned</Text>
              <TextInput
                style={styles.input}
                value={judgeName}
                onChangeText={setJudgeName}
                onBlur={() => handleUpdateField('judgeName', judgeName)}
                placeholder="e.g. Justice Ramaswamy"
                placeholderTextColor={COLORS.textMuted} />
              
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Next Hearing Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={nextHearingDate}
                onChangeText={setNextHearingDate}
                onBlur={() => handleUpdateField('nextHearingDate', nextHearingDate)}
                placeholder="e.g. 2026-06-30"
                placeholderTextColor={COLORS.textMuted} />
              
            </View>
          </View>
        </View>

        {/* ─── CASE STATUS SELECTOR ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ Case Status Stage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
            <View style={styles.statusContainer}>
              {CASE_STATUSES.map((status) => {
                const isActive = caseObj.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                    styles.statusChip,
                    isActive && {
                      backgroundColor: STATUS_COLORS[status],
                      borderColor: STATUS_COLORS[status]
                    }]
                    }
                    onPress={() => handleStatusChange(status)}>
                    
                    <Text style={[styles.statusChipText, isActive && styles.activeStatusText]}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>);

              })}
            </View>
          </ScrollView>
        </View>

        {/* ─── LINKED DOCUMENTS ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📄 Case Documents</Text>
            <TouchableOpacity
              style={styles.addDocBtn}
              onPress={() => setLinkModalVisible(true)}>
              
              <Text style={styles.addDocBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {linkedDocs.length === 0 ?
          <View style={styles.emptyDocsCard}>
              <Text style={styles.emptyDocsText}>No documents linked to this case folder.</Text>
            </View> :

          linkedDocs.map((doc) =>
          <View key={doc.id} style={styles.docCard}>
                <TouchableOpacity
              style={styles.docInfo}
              onPress={() =>
              navigation.navigate('DocumentDetails', {
                docId: doc.id,
                docName: doc.name
              })
              }>
              
                  <Text style={styles.docIcon}>📄</Text>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
              style={styles.unlinkBtn}
              onPress={() => handleUnlinkDocument(doc.id, doc.name)}>
              
                  <Text style={styles.unlinkBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
          )
          }
        </View>

        {/* ─── CASE TOOLS HUB (Roadmap) ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Workspace Tools</Text>
          <View style={styles.toolGrid}>
            {renderToolItem('Timeline', '📅', true)}
            {renderToolItem('Contradictions', '⚠️', false)}
            {renderToolItem('Entity Tracker', '👥', false)}
            {renderToolItem('Missing Docs', '📂', false)}
            {renderToolItem('Hearing Prep', '⚡', false)}
            {renderToolItem('Opponent Predictor', '🎯', false)}
            {renderToolItem('Client Questions', '❓', false)}
            {renderToolItem('Draft Notice', '📝', false)}
            {renderToolItem('Indian Law Sections', '📖', false)}
            {renderToolItem('Evidence Chain', '🔗', false)}
          </View>
        </View>
      </ScrollView>

      {/* ─── LINK DOCUMENT MODAL ─── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={linkModalVisible}
        onRequestClose={() => setLinkModalVisible(false)}>
        
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📄 Select Document to Link</Text>
              <TouchableOpacity onPress={() => setLinkModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {availableDocs.length === 0 ?
            <View style={styles.noAvailableDocs}>
                <Text style={styles.noAvailableDocsText}>
                  No other documents available. Upload a new PDF under the Documents tab first.
                </Text>
              </View> :

            <FlatList
              data={availableDocs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) =>
              <TouchableOpacity
                style={styles.availableDocItem}
                onPress={() => handleLinkDocument(item.id)}>
                
                    <Text style={styles.docIcon}>📄</Text>
                    <Text style={styles.availableDocName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
              } />

            }
          </View>
        </View>
      </Modal>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  errorText: {
    fontSize: FONTS.subheading,
    color: COLORS.error,
    fontWeight: FONTS.weightBold,
    marginBottom: SPACING.md
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm
  },
  backBtnText: {
    color: COLORS.background,
    fontWeight: FONTS.weightBold
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl
  },
  section: {
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  metaForm: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md
  },
  inputGroup: {
    gap: SPACING.xs
  },
  label: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary
  },
  input: {
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    color: COLORS.textPrimary,
    padding: SPACING.sm,
    fontSize: FONTS.body
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: COLORS.surface
  },
  statusScroll: {
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg
  },
  statusContainer: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  statusChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  statusChipText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold
  },
  activeStatusText: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightBold
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  addDocBtn: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  addDocBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold
  },
  emptyDocsCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  emptyDocsText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  docInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  docIcon: {
    fontSize: 20,
    marginRight: SPACING.sm
  },
  docName: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
    flex: 1
  },
  unlinkBtn: {
    padding: SPACING.sm
  },
  unlinkBtnText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: FONTS.weightBold
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md
  },
  toolCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.xs
  },
  toolCardDisabled: {
    opacity: 0.6
  },
  toolIcon: {
    fontSize: 28
  },
  toolTitle: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightBold,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '70%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  modalTitle: {
    fontSize: FONTS.heading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  closeButton: {
    fontSize: FONTS.heading,
    color: COLORS.textSecondary,
    padding: SPACING.xs
  },
  noAvailableDocs: {
    padding: SPACING.xl,
    alignItems: 'center'
  },
  noAvailableDocsText: {
    fontSize: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22
  },
  availableDocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  availableDocName: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
    flex: 1
  }
});

export default CaseDetailsScreen;