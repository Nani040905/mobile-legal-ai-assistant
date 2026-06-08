/*
 * caseType.ts — CaseType union type for perspective-aware legal analysis.
 *
 * PURPOSE: Defines the legal case category that controls how prompts are
 * constructed. The same perspective ("Accused") behaves differently across
 * case types (Criminal vs. Consumer Complaint vs. Employment Dispute).
 */

export type CaseType =
  | 'criminal'
  | 'civil'
  | 'consumer'
  | 'employment'
  | 'property'
  | 'family'
  | 'contract'
  | 'tax'
  | 'constitutional'
  | 'unknown';

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  criminal: 'Criminal',
  civil: 'Civil',
  consumer: 'Consumer',
  employment: 'Employment',
  property: 'Property',
  family: 'Family',
  contract: 'Contract',
  tax: 'Tax',
  constitutional: 'Constitutional',
  unknown: 'General',
};

export const CASE_TYPE_FOCUS: Record<CaseType, string[]> = {
  criminal: [
    'burden of proof on prosecution',
    'procedural defects in FIR or charge sheet',
    'admissibility of evidence under BSA',
    'available defenses under BNS',
    'bail conditions and rights of accused',
  ],
  civil: [
    'cause of action and limitation period',
    'jurisdiction under CPC',
    'documentary evidence requirements',
    'injunction eligibility',
    'damages calculation',
  ],
  consumer: [
    'deficiency of service definition',
    'NCDRC or DCDRC jurisdiction limits',
    'available remedies under Consumer Protection Act 2019',
    'complaint filing timeline',
    'unfair trade practice provisions',
  ],
  employment: [
    'wrongful termination provisions',
    'notice period obligations',
    'gratuity and PF entitlements',
    'Industrial Disputes Act applicability',
    'non-compete enforceability',
  ],
  property: [
    'title document validity',
    'encumbrance and charge search',
    'RERA applicability',
    'possession and delivery obligations',
    'mutation and registration requirements',
  ],
  family: [
    'matrimonial rights and obligations',
    'maintenance and alimony provisions',
    'child custody and guardianship',
    'Hindu Succession Act applicability',
    'dowry prohibition compliance',
  ],
  contract: [
    'essential elements of valid contract',
    'breach and remedies',
    'indemnification caps and liability clauses',
    'dispute resolution and arbitration',
    'governing law and jurisdiction',
  ],
  tax: [
    'tax liability assessment',
    'exemptions and deductions claimed',
    'GST compliance',
    'income tax appeal provisions',
    'penalty and interest provisions',
  ],
  constitutional: [
    'fundamental rights violations',
    'writs available (habeas corpus, mandamus, certiorari)',
    'locus standi requirements',
    'state action doctrine',
    'directive principles applicability',
  ],
  unknown: [
    'identify applicable law',
    'key parties and their obligations',
    'risk clauses and problematic provisions',
    'remedies available',
    'missing or ambiguous terms',
  ],
};
