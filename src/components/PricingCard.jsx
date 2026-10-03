import Button from './Button.jsx';
import { formatFrom } from '../content/pricing.js';

export default function PricingCard({ plan, quoteTo = '/get-a-quote?type=business', headingLevel: Heading = 'h3' }) {
  return (
    <article className={`plan${plan.featured ? ' plan--featured' : ''}`}>
      <div className="plan__head">
        <Heading className="plan__name">{plan.name}</Heading>
        {plan.tag ? <p className="plan__tag">{plan.tag}</p> : null}
      </div>
      <p className="plan__price">{formatFrom(plan.price)}</p>
      <p className="plan__summary">{plan.summary}</p>
      {plan.scope ? <p className="plan__scope">{plan.scope}</p> : null}

      {plan.suitableFor.length > 0 ? (
        <>
          <p className="plan__label">Typically suits</p>
          <ul className="plan__list">
            {plan.suitableFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}

      <Button to={quoteTo} variant={plan.featured ? 'inverse' : 'primary'} block className="plan__cta">
        Get a Quote
      </Button>
    </article>
  );
}
