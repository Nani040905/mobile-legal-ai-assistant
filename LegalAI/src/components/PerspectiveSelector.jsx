/*
 * PerspectiveSelector.tsx — Interactive selector for Legal Perspective and Case Type.
 *
 * PURPOSE: A reusable selector displaying horizontal scrollable chip rows
 * for choosing the active role (Perspective) and case category (Case Type).
 * Integrates directly with useChatStore for global persistence.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import useChatStore from '../store/useChatStore';
import { PERSPECTIVE_LABELS } from '../types/legalPerspective';
import { CASE_TYPE_LABELS } from '../types/caseType';

const PERSPECTIVES = [
'neutral', 'plaintiff', 'defendant', 'complainant', 'accused',
'petitioner', 'respondent', 'employee', 'employer', 'tenant', 'landlord', 'consumer', 'business'];


const CASE_TYPES = [
'unknown', 'criminal', 'civil', 'consumer', 'employment',
'property', 'family', 'contract', 'tax', 'constitutional'];






const PerspectiveSelector = ({ compact = false }) => {
  const selectedPerspective = useChatStore((s) => s.selectedPerspective);
  const selectedCaseType = useChatStore((s) => s.selectedCaseType);
  const setPerspective = useChatStore((s) => s.setPerspective);
  const setCaseType = useChatStore((s) => s.setCaseType);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* ─── PERSPECTIVE ROW ─── */}
      <View style={styles.row}>
        <Text style={styles.label}>Role</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          
          {PERSPECTIVES.map((p) => {
            const isActive = selectedPerspective === p;
            return (
              <TouchableOpacity
                key={p}
                activeOpacity={0.7}
                onPress={() => setPerspective(p)}
                style={[
                styles.chip,
                isActive && styles.chipActive,
                compact && styles.compactChip]
                }>
                
                <Text style={[
                styles.chipText,
                isActive && styles.chipTextActive,
                compact && styles.compactChipText]
                }>
                  {PERSPECTIVE_LABELS[p]}
                </Text>
              </TouchableOpacity>);

          })}
        </ScrollView>
      </View>

      {/* ─── CASE TYPE ROW ─── */}
      <View style={[styles.row, { marginTop: compact ? SPACING.xs : SPACING.sm }]}>
        <Text style={styles.label}>Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          
          {CASE_TYPES.map((c) => {
            const isActive = selectedCaseType === c;
            return (
              <TouchableOpacity
                key={c}
                activeOpacity={0.7}
                onPress={() => setCaseType(c)}
                style={[
                styles.chip,
                isActive && styles.chipActive,
                compact && styles.compactChip]
                }>
                
                <Text style={[
                styles.chipText,
                isActive && styles.chipTextActive,
                compact && styles.compactChipText]
                }>
                  {CASE_TYPE_LABELS[c]}
                </Text>
              </TouchableOpacity>);

          })}
        </ScrollView>
      </View>
    </View>);

};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  compactContainer: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  label: {
    fontSize: FONTS.small,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    minWidth: 40,
    marginRight: SPACING.xs
  },
  scrollContent: {
    paddingRight: SPACING.xl,
    alignItems: 'center'
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.xs
  },
  compactChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginRight: 4
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  chipText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary
  },
  compactChipText: {
    fontSize: FONTS.small
  },
  chipTextActive: {
    color: COLORS.background
  }
});

export default PerspectiveSelector;