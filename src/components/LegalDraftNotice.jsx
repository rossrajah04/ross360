import { site } from '../content/site.js';

// Shown on the Privacy Notice and Terms pages while the legal wording is a draft.
// Switch it off with `legalDraft: false` in src/content/site.js once the wording is approved.
export default function LegalDraftNotice() {
  if (!site.legalDraft) return null;
  return (
    <p className="notice" role="note">
      Draft for review (prepared {site.legalDraftDate}). Final wording is to be confirmed. Items shown in square
      brackets are not yet decided.
    </p>
  );
}
