import LegalPage from '../components/legal/LegalPage.jsx';
import { privacy } from '../content/privacy.js';

// Privacy Notice. Wording, the services it is based on and the points still to confirm are in
// src/content/privacy.js. The notice must only describe services the website and business actually use.
export default function Privacy() {
  return <LegalPage page="privacy" content={privacy} />;
}
