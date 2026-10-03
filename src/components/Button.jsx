import { Link } from 'react-router-dom';

// One component for all buttons/links styled as buttons.
//   <Button to="/get-a-quote">…</Button>   internal link
//   <Button href="mailto:…">…</Button>     external / mailto link
//   <Button onClick={fn}>…</Button>        real button
export default function Button({
  to,
  href,
  variant = 'primary',
  size,
  block = false,
  className = '',
  children,
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, size ? `btn--${size}` : '', block ? 'btn--block' : '', className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
