// Native <details>/<summary>: accessible and keyboard friendly with no JavaScript state.
export default function FAQItem({ question, answer }) {
  return (
    <details className="faq__item">
      <summary>{question}</summary>
      <p>{answer}</p>
    </details>
  );
}
