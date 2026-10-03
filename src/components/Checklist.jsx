export default function Checklist({ items, columns = false }) {
  return (
    <ul className={`checklist${columns ? ' checklist--columns' : ''}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
