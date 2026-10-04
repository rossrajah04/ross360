// Top-of-page introduction for inner pages. Renders the single H1 for the page.
export default function PageHero({ title, lead, children }) {
  return (
    <section className="page-hero">
      <div className="container page-hero__inner">
        <h1 className="page-hero__title">{title}</h1>
        {lead || children ? (
          <div className="page-hero__aside">
            {lead ? <p className="lead">{lead}</p> : null}
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
