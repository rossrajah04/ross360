import { Fragment } from 'react';
import Seo from '../components/Seo.jsx';
import { site } from '../content/site.js';
import { privacy } from '../content/privacy.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/legal.css';

// Privacy Notice. Wording, the services it is based on and the points still to confirm are in
// src/content/privacy.js. The notice must only describe services the website and business actually use.

const ICO_URL = 'https://ico.org.uk/make-a-complaint/';

// Renders {email} and {ico} in a string as links.
function Text({ children }) {
  return children.split(/(\{email\}|\{ico\})/).map((part, index) => {
    if (part === '{email}') {
      return (
        <a key={index} href={`mailto:${site.email}`}>
          {site.email}
        </a>
      );
    }
    if (part === '{ico}') {
      return (
        <a key={index} href={ICO_URL}>
          ico.org.uk
        </a>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
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

export default function Privacy() {
  const intro = privacy.sections.find((section) => section.intro);
  const sections = privacy.sections.filter((section) => !section.intro);

  return (
    <div className="home vt sp lg">
      <Seo page="privacy" />

      <section className="vt-intro sp-intro" aria-labelledby="lg-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="lg-title" className="vt-intro__title sp-intro__title">
            {privacy.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{privacy.lead}</p>
            <ul className="sp-facts">
              <li>Last updated {privacy.updated}</li>
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
