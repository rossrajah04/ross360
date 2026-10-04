import Seo from '../components/Seo.jsx';
import { Standards, Stages, Deliverables, ClosingCta } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { about } from '../content/about.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/about.css';

// About: what ROSS 360 does, its approach, what customers can expect, who the service is for, the
// ROSS 360 Standard and where it works, then the enquiry. A brand page built from the service pages'
// styles, set in type alone: no portraits, team or office photographs.

export default function About() {
  useReveal();
  const { hero, does, approach, expect, who, standard, ukWide, closing } = about;

  return (
    <div className="home vt sp ab">
      <Seo page="about" />

      <section className="vt-intro sp-intro" aria-labelledby="ab-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="ab-title" className="vt-intro__title sp-intro__title">
            {hero.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{hero.lead}</p>
          </div>
        </div>
      </section>

      <section className="ab-split" aria-labelledby="ab-does-title">
        <div className="h-wrap ab-split__grid">
          <h2 id="ab-does-title" className="h-h2 ab-split__title" data-reveal>
            {does.title}
          </h2>
          <div className="ab-split__body" data-reveal>
            {does.paragraphs.map((text) => (
              <p key={text} className="ab-text">
                {text}
              </p>
            ))}
            <div className="ab-objective">
              <p className="ab-objective__label">{does.objectiveLabel}</p>
              <p className="ab-objective__text">{does.objective}</p>
            </div>
          </div>
        </div>
      </section>

      <Stages id="ab-approach-title" title={approach.title} intro={approach.intro} steps={approach.steps} />
      <Deliverables id="ab-expect-title" title={expect.title} items={expect.items} />

      <section className="ab-split" aria-labelledby="ab-who-title">
        <div className="h-wrap ab-split__grid">
          <h2 id="ab-who-title" className="h-h2 ab-split__title" data-reveal>
            {who.title}
          </h2>
          <div className="ab-split__body ab-groups" data-reveal>
            {who.groups.map((group) => (
              <div key={group.label} className="ab-group">
                <h3 className="ab-group__label">{group.label}</h3>
                <ul className="ab-group__list">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Standards id="ab-standard-title" title={standard.title} items={standard.items} />

      <section className="ab-split sp-last" aria-labelledby="ab-uk-title">
        <div className="h-wrap ab-split__grid ab-split__grid--ruled">
          <h2 id="ab-uk-title" className="h-h2 ab-split__title" data-reveal>
            {ukWide.title}
          </h2>
          <div className="ab-split__body" data-reveal>
            {ukWide.paragraphs.map((text) => (
              <p key={text} className="ab-text">
                {text}
              </p>
            ))}
          </div>
        </div>
      </section>

      <ClosingCta {...closing} />
    </div>
  );
}
