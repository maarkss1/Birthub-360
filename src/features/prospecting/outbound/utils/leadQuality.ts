import type { Lead, LeadQualityMetric } from '../types.js';

export function calculateLeadQuality(lead: Lead): LeadQualityMetric {
  const mainDm = lead.decision_makers?.[0] || {
    name: lead.decision_maker_name || '',
    title: lead.decision_maker_title || '',
    email: lead.decision_maker_email || '',
    linkedin: lead.decision_maker_linkedin || ''
  };

  const hasDecisionMaker = Boolean(
    mainDm.name && 
    mainDm.name.trim().length > 2 && 
    !mainDm.name.toLowerCase().includes('não informado') &&
    !mainDm.name.toLowerCase().includes('empresa alvo')
  );

  const hasTitle = Boolean(
    mainDm.title && 
    mainDm.title.trim().length > 2 && 
    !mainDm.title.toLowerCase().includes('não informado')
  );

  const hasEmail = Boolean(
    mainDm.email?.includes('@') && 
    !mainDm.email.toLowerCase().includes('não revelado') &&
    !mainDm.email.startsWith('contato@')
  );

  const hasLinkedin = Boolean(
    mainDm.linkedin?.includes('linkedin.com') && 
    mainDm.linkedin.length > 15
  );

  const hasPhone = Boolean(
    lead.phone && 
    lead.phone.trim().length >= 8 && 
    lead.phone !== 'N/A' &&
    !lead.phone.includes('0000')
  );

  const hasWebsite = Boolean(
    (lead.website && lead.website.length > 5) || 
    (lead.domain && lead.domain.length > 3)
  );

  let score = 0;
  if (lead.name && lead.name.trim().length > 1) score += 10;
  if (hasDecisionMaker) score += 25;
  if (hasTitle) score += 15;
  if (hasEmail) score += 25;
  if (hasLinkedin) score += 10;
  if (hasPhone) score += 10;
  if (hasWebsite) score += 5;

  score = Math.min(100, score);

  let tier: 'green' | 'yellow' | 'red' = 'red';
  let tierLabel = 'Atenção (Bronze)';

  if (score >= 75) {
    tier = 'green';
    tierLabel = 'Alta Qualidade (Ouro)';
  } else if (score >= 45) {
    tier = 'yellow';
    tierLabel = 'Média Qualidade (Prata)';
  }

  const checklist = [hasDecisionMaker, hasTitle, hasEmail, hasLinkedin, hasPhone, hasWebsite];
  const completionCount = checklist.filter(Boolean).length;

  return {
    score,
    tier,
    tierLabel,
    hasDecisionMaker,
    hasTitle,
    hasEmail,
    hasLinkedin,
    hasPhone,
    hasWebsite,
    completionCount,
    totalFields: checklist.length
  };
}
