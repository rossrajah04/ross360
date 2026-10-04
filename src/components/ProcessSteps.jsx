import { processSteps } from '../content/services.js';

// 01 Enquire, 02 Quote, 03 Schedule, 04 Capture, 05 Production, 06 Delivery
export default function ProcessSteps({ steps = processSteps }) {
  return (
    <ol className="process">
      {steps.map((step, index) => (
        <li key={step.title} className="process__item">
          <span className="process__num" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="process__title">
            <span className="visually-hidden">Step {index + 1}: </span>
            {step.title}
          </h3>
          <p className="process__text">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
