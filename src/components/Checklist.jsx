export default function Checklist({ items, columns = false }) {
  return (
    <ul className={`ruled-list${columns ? ' ruled-list--columns' : ''}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
