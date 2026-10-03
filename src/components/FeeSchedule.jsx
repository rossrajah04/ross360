import { Link } from 'react-router-dom';
import { plans, formatFrom } from '../content/pricing.js';

// Business packages presented as a fee schedule: one row per package.
export default function FeeSchedule({ headingLevel: Heading = 'h3', quoteTo = '/get-a-quote?type=business' }) {
  return (
    <div className="fees">
      {plans.map((plan) => (
        <article key={plan.id} className={`fee${plan.featured ? ' fee--main' : ''}`}>
          <div className="fee__head">
            <Heading className="fee__name">{plan.name}</Heading>
            {plan.tag ? <p className="fee__tag">{plan.tag}</p> : null}
          </div>
          <p className="fee__price">{formatFrom(plan.price)}</p>
          <div className="fee__detail">
            <p className="fee__summary">{plan.summary}</p>
            {plan.scope ? <p className="fee__scope">{plan.scope}</p> : null}
            {plan.includes.length > 0 ? (
              <ul className="fee__includes" aria-label={`${plan.name} includes`}>
                {plan.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="fee__cta">
            <Link to={quoteTo} className={`btn btn--sm ${plan.featured ? 'btn--primary' : 'btn--secondary'}`}>
              Get a Quote<span className="visually-hidden">: {plan.name}</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
