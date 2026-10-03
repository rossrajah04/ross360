import Button from './Button.jsx';
import { site } from '../content/site.js';

// Strong but understated closing call to action.
export default function CtaBand({
  heading = site.cta.finalHeading,
  label = site.cta.primary,
  to = '/get-a-quote',
}) {
  return (
    <section className="section section--dark cta-band" aria-labelledby="cta-heading">
      <div className="container container--narrow">
        <h2 id="cta-heading">{heading}</h2>
        <Button to={to} variant="inverse">
          {label}
        </Button>
      </div>
    </section>
  );
}
