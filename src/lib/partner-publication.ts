export type PartnerPublicationEvidence = {
  representative_name?: string | null;
  business_verified_at?: string | null;
  agreement_reference?: string | null;
  agreement_signed_at?: string | null;
  benefit_dispute_contact?: string | null;
};

/** Application fallback only; PostgreSQL publication gates remain authoritative. */
export function hasCompletePartnerEvidence(evidence: PartnerPublicationEvidence | null | undefined): boolean {
  return Boolean(
    evidence?.representative_name?.trim() &&
      evidence.business_verified_at?.trim() &&
      evidence.agreement_reference?.trim() &&
      evidence.agreement_signed_at?.trim() &&
      evidence.benefit_dispute_contact?.trim(),
  );
}
