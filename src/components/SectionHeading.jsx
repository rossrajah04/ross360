// Consistent section heading. `as` controls the element so heading levels stay logical per page.
// `id` lets a parent <section aria-labelledby="…"> point at the heading.
export default function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  as: Tag = 'h2',
  align = 'left',
  className = '',
}) {
  return (
    <div className={`section-heading section-heading--${align} ${className}`.trim()}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Tag id={id}>{title}</Tag>
      {lead ? <p className="lead">{lead}</p> : null}
    </div>
  );
}
