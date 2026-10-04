import LegalPage from '../components/legal/LegalPage.jsx';
import { terms } from '../content/terms.js';

// Terms & Conditions. Wording, the decisions it reflects and the points for legal review are in
// src/content/terms.js.
export default function Terms() {
  return <LegalPage page="terms" content={terms} />;
}
