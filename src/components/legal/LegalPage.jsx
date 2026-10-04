import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../Seo.jsx';
import { site } from '../../content/site.js';
import '../../styles/home.css';
import '../../styles/virtual-tours.css';
import '../../styles/service-pages.css';
import '../../styles/legal.css';

// A legal page (Privacy Notice, Terms & Conditions): the service pages' hero, then a contents list
// beside numbered sections. Wording lives in src/content/<page>.js as sections of blocks:
// { h } sub-heading, { p } paragraph, { ul } list, { dl } [term, text] pairs.
// In any string, {email}, {ico}, {privacy} and {quote} are rendered as links.

const ICO_URL = 'https://ico.org.uk/make-a-complaint/';

const TOKENS = {
  '{email}': (key) => (
    <a key={key} href={`mailto:${site.email}`}>
      {site.email}
    </a>
  ),
  '{ico}': (key) => (
    <a key={key} href={ICO_URL}>
      ico.org.uk
    </a>
  ),
  '{privacy}': (key) => (
    <Link key={key} to="/privacy">
      Privacy Notice
    </Link>
  ),
  '{quote}': (key) => (
    <Link key={key} to="/get-a-quote">
      Get a Quote
    </Link>
  ),
};

const TOKEN_RE = /(\{email\}|\{ico\}|\{privacy\}|\{quote\})/;

function Text({ children }) {
  return children
    .split(TOKEN_RE)
    .map((part, index) => (TOKENS[part] ? TOKENS[part](index) : <Fragment key={index}>{part}</Fragment>));
}

function Block({ block }) {
  if (block.h) return <h3 className="lg-h3">{block.h}</h3>;
  if (block.p) {
    return (
      <p>
        <Text>{block.p}</Text>
      </p>
    );
  }
  if (block.ul) {
    return (
      <ul className="lg-list">
        {block.ul.map((item) => (
          <li key={item}>
            <Text>{item}</Text>
          </li>
        ))}
      </ul>
    );
  }
  if (block.dl) {
    return (
      <dl className="lg-defs">
        {block.dl.map(([term, text]) => (
          <div key={term} className="lg-def">
            <dt>{term}</dt>
            <dd>
              <Text>{text}</Text>
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export default function LegalPage({ page, content }) {
  const intro = content.sections.find((section) => section.intro);
  const sections = content.sections.filter((section) => !section.intro);

  return (
    <div className="home vt sp lg">
      <Seo page={page} />

      <section className="vt-intro sp-intro" aria-labelledby="lg-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="lg-title" className="vt-intro__title sp-intro__title">
            {content.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{content.lead}</p>
            <ul className="sp-facts">
              <li>Last updated {content.updated}</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="lg-body">
        <div className="h-wrap lg-layout">
          <nav className="lg-contents" aria-labelledby="lg-contents-title">
            <h2 id="lg-contents-title" className="lg-contents__title">
              Contents
            </h2>
            <ol className="lg-contents__list">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="lg-text">
            {intro ? (
              <div className="lg-intro">
                {intro.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            ) : null}
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="lg-section" aria-labelledby={`${section.id}-title`}>
                <h2 id={`${section.id}-title`} className="lg-h2">
                  <span className="lg-h2__num">{index + 1}.</span> {section.title}
                </h2>
                {section.blocks.map((block, blockIndex) => (
                  <Block key={blockIndex} block={block} />
                ))}
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
