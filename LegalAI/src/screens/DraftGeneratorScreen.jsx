import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import { generateLegalDraft, DRAFT_TEMPLATES } from '../services/draftGenerator';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const DraftGeneratorScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const caseId = route.params?.caseId || null;

  const caseObj = useCaseStore((state) => caseId ? state.getCaseById(caseId) : null);

  const [templateType, setTemplateType] = useState('legal_notice');
  const [clientName, setClientName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [court, setCourt] = useState('');
  const [facts, setFacts] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [draftedText, setDraftedText] = useState('');

  // Auto-populate when case details are available
  useEffect(() => {
    if (caseObj) {
      setClientName(caseObj.clientName || '');
      setOpponentName(caseObj.opponentName || '');
      setCourt(caseObj.court || '');
    }
  }, [caseObj]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgressText('Preparing templates...');
    setDraftedText('');

    try {
      const result = await generateLegalDraft(caseId, templateType, {
        clientName,
        opponentName,
        court,
        facts
      }, (text) => {
        setProgressText(text);
      });

      setDraftedText(result);
    } catch (err) {
      Alert.alert('Draft Error', err.message || 'An error occurred during draft creation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (draftedText) {
      Clipboard.setString(draftedText);
      Alert.alert('Copied ✅', 'The legal draft has been copied to your clipboard.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Draft Notice 📝"
        subtitle={caseObj ? caseObj.title : 'Standalone Draft Generator'}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {isGenerating ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{progressText}</Text>
          <Text style={styles.loadingSubtext}>
            Formatting Indian legal styling and preambles to draft your document...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!draftedText ? (
            <View>
              {/* Selector */}
              <Text style={styles.label}>Select Document Template</Text>
              <View style={styles.templatePickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
                  {Object.keys(DRAFT_TEMPLATES).map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.templateChip, templateType === key && styles.templateChipActive]}
                      onPress={() => setTemplateType(key)}
                    >
                      <Text style={[styles.templateChipText, templateType === key && styles.templateChipTextActive]}>
                        {DRAFT_TEMPLATES[key]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Form Inputs */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Document Details</Text>
                
                <Text style={styles.inputLabel}>Client / Sender Name</Text>
                <TextInput
                  style={styles.input}
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="e.g. Rajesh Kumar"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.inputLabel}>Opponent / Recipient Name</Text>
                <TextInput
                  style={styles.input}
                  value={opponentName}
                  onChangeText={setOpponentName}
                  placeholder="e.g. State of Maharashtra"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.inputLabel}>Court / Forum Jurisdiction</Text>
                <TextInput
                  style={styles.input}
                  value={court}
                  onChangeText={setCourt}
                  placeholder="e.g. High Court of Delhi"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.inputLabel}>Custom Facts / Dispute Details (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={facts}
                  onChangeText={setFacts}
                  placeholder="Provide any custom dispute points or financial amounts to include..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleGenerate}>
                <Text style={styles.actionBtnText}>Generate Legal Draft</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.draftCard}>
                <Text style={styles.draftCardTitle}>Draft Preview</Text>
                <TextInput
                  style={styles.draftEditor}
                  value={draftedText}
                  onChangeText={setDraftedText}
                  multiline={true}
                  scrollEnabled={false}
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyToClipboard}>
                  <Text style={styles.copyBtnText}>📋 Copy to Clipboard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setDraftedText('')}>
                  <Text style={styles.secondaryBtnText}>Back / Edit Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  loadingText: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.md
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl
  },
  label: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm
  },
  templatePickerContainer: {
    marginBottom: SPACING.md
  },
  pickerScroll: {
    paddingVertical: SPACING.xs
  },
  templateChip: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  templateChipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary
  },
  templateChipText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary
  },
  templateChipTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weightBold
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  inputLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  input: {
    backgroundColor: COLORS.surfaceVariant,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
    fontSize: FONTS.body
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center'
  },
  actionBtnText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.background
  },
  draftCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  draftCardTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs
  },
  draftEditor: {
    color: COLORS.textPrimary,
    fontSize: FONTS.caption,
    lineHeight: 20,
    fontFamily: 'Courier',
    textAlignVertical: 'top'
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  copyBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginRight: SPACING.sm
  },
  copyBtnText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.background
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center'
  },
  secondaryBtnText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary
  }
});

export default DraftGeneratorScreen;
