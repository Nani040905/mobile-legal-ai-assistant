/*
 * legalPerspective.ts — LegalPerspective union type for perspective-aware analysis.
 *
 * PURPOSE: Defines all legal roles a user can occupy when analyzing a document.
 * Prompts are customized based on the active perspective so the LLM focuses on
 * what matters most for that party's position.
 */
















export const PERSPECTIVE_LABELS = {
  neutral: 'Neutral',
  plaintiff: 'Plaintiff',
  defendant: 'Defendant',
  complainant: 'Complainant',
  accused: 'Accused',
  petitioner: 'Petitioner',
  respondent: 'Respondent',
  employee: 'Employee',
  employer: 'Employer',
  tenant: 'Tenant',
  landlord: 'Landlord',
  consumer: 'Consumer',
  business: 'Business'
};

export const PERSPECTIVE_FOCUS = {
  neutral: 'Provide a balanced analysis identifying risks and opportunities for all parties.',
  plaintiff: 'Focus on: cause of action strength, evidence supporting claims, damages available, limitation period compliance.',
  defendant: 'Focus on: available defenses, procedural weaknesses in plaintiff\'s case, counterclaim possibilities, settlement leverage.',
  complainant: 'Focus on: documenting the grievance, available forums, compensation remedies, filing timelines.',
  accused: 'Focus on: burden of proof on prosecution, procedural defects, admissibility of evidence, defense rights and bail.',
  petitioner: 'Focus on: constitutional or statutory basis for petition, urgency grounds, relief sought, locus standi.',
  respondent: 'Focus on: grounds to oppose petition, procedural objections, jurisdictional challenges.',
  employee: 'Focus on: employment rights violations, notice period compliance, severance entitlements, legal remedies under labour law.',
  employer: 'Focus on: disciplinary procedure compliance, contractual obligations, liability exposure, IP and confidentiality protection.',
  tenant: 'Focus on: clauses favoring landlord, deposit forfeiture risks, arbitrary termination traps, maintenance obligations.',
  landlord: 'Focus on: default and eviction provisions, rent recovery, property damage clauses, notice requirements.',
  consumer: 'Focus on: deficiency of service, unfair trade practice, compensation forum (DCDRC/NCDRC), complaint timeline.',
  business: 'Focus on: liability limitation, indemnification caps, IP ownership, dispute resolution efficiency, enforceability.'
};