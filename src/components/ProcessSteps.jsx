import { processSteps } from '../content/services.js';

// Enquire, Quote, Schedule, Capture, Production, Delivery
export default function ProcessSteps({ steps = processSteps, tone = 'light' }) {
  return (
    <ol className={`steps steps--${tone}`}>
      {steps.map((step, index) => (
        <li key={step.title} className="steps__item">
          <span className="steps__num" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="steps__title">
            <span className="visually-hidden">Step {index + 1}: </span>
            {step.title}
          </h3>
          <p>{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
