import Button from './Button.jsx';
import { formatFrom } from '../content/pricing.js';

export default function PricingCard({ plan, quoteTo = '/get-a-quote?type=business' }) {
  return (
    <article className={`plan${plan.featured ? ' plan--featured' : ''}`}>
      {plan.tag ? <p className="plan__tag">{plan.tag}</p> : null}
      <h3 className="plan__name">{plan.name}</h3>
      <p className="plan__price">{formatFrom(plan.price)}</p>
      <p className="plan__summary">{plan.summary}</p>

      {plan.suitableFor.length > 0 ? (
        <>
          <p className="plan__label">Suitable for</p>
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
