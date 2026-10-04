// Section heading: the heading sits in the left column; an optional lead or children sit in the right
// column on wide screens. `id` lets a parent <section aria-labelledby="…"> point at the heading.
export default function SectionHeading({ id, title, lead, as: Tag = 'h2', children, className = '' }) {
  return (
    <div className={`section-head ${className}`.trim()}>
      <Tag id={id} className="section-head__title">
        {title}
      </Tag>
      {lead || children ? (
        <div className="section-head__aside">
          {lead ? <p className="lead">{lead}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}
