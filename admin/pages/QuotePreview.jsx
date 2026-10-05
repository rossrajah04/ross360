import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, quotePreviewUrl } from '../api.js';
import { formatMoney } from '../../src/lib/admin/model.js';
import { sendProblems } from '../../src/lib/admin/quotes.js';
import { QuoteTag } from '../components/Bits.jsx';

// The exact email the customer will receive, rendered by the server, with Send.
export default function QuotePreview() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.previewQuote(reference).then((result) => {
      if (result.status === 401) return;
      if (result.status === 404) setError('That quote does not exist.');
      else if (result.ok) setData(result);
      else setError(result.message || 'Something went wrong.');
    });
  }, [reference]);

  if (error && !data) {
    return (
      <p className="ad-error" role="alert">
        {error}
      </p>
    );
  }
  if (!data) return <p className="ad-muted">Loading…</p>;

  const { quote, email } = data;
  const problems = quote.status === 'draft' ? sendProblems(quote) : [];
  const canSend = quote.status === 'draft' && !problems.length;

  const send = async () => {
    const ok = window.confirm(`Send ${quote.reference} for ${formatMoney(quote.totalPence)} to ${quote.customerEmail}?`);
    if (!ok) return;
    setSending(true);
    setError('');
    const result = await api.sendQuote(quote.reference, quote.version);
    if (result.status === 401) return;
    if (result.ok) {
      navigate(`/quotes/${quote.reference}`, { state: { message: `${quote.reference} sent to ${quote.customerEmail}.` } });
      return;
    }
    // Stays locked if the quote has moved on (sent, being sent or changed); otherwise it can be retried.
    if (result.quote) setData({ ...data, quote: result.quote });
    setSending(false);
    setError([result.message, ...(result.problems || [])].filter(Boolean).join(' '));
  };

  return (
    <>
      <div className="ad-head">
        <div>
          <p className="ad-muted">
            <Link className="ad-link" to={`/quotes/${quote.reference}`}>
              Back to {quote.reference}
            </Link>
          </p>
          <h1 className="ad-h1">
            Preview {quote.reference}
            <QuoteTag status={quote.status} />
          </h1>
        </div>
      </div>

      {error ? (
        <p className="ad-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="ad-section">
        <dl className="ad-facts">
          <dt>From</dt>
          <dd>{email.from}</dd>
          <dt>To</dt>
          <dd>{email.to || <span className="ad-field__error">No email address</span>}</dd>
          <dt>Copy (BCC)</dt>
          <dd>{email.bcc}</dd>
          <dt>Subject</dt>
          <dd>{email.subject}</dd>
          <dt>Total</dt>
          <dd>{formatMoney(quote.totalPence)}</dd>
        </dl>

        {problems.length ? (
          <div className="ad-error" role="alert">
            Before this can be sent:
            <ul className="ad-list">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {quote.status === 'draft' ? (
          <div className="ad-actions">
            <button type="button" className="ad-button" onClick={send} disabled={!canSend || sending}>
              {sending ? 'Sending…' : 'Send quote'}
            </button>
            <Link className="ad-button ad-button--quiet" to={`/quotes/${quote.reference}`}>
              Edit draft
            </Link>
          </div>
        ) : (
          <p className="ad-note">This quote is {quote.status} and cannot be sent from here.</p>
        )}
      </section>

      <section className="ad-section">
        <h2 className="ad-h2">Email</h2>
        <iframe
          className="ad-preview-frame"
          title={`Preview of quote ${quote.reference}`}
          sandbox=""
          src={quotePreviewUrl(quote.reference, quote.version)}
        />
        <details className="ad-details">
          <summary>Plain-text version</summary>
          <pre className="ad-pre">{email.text}</pre>
        </details>
      </section>
    </>
  );
}
