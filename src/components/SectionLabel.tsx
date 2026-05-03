type Props = { num: string; title: string; hint: string };

export default function SectionLabel({ num, title, hint }: Props) {
  return (
    <div className="section-label">
      <span className="num-badge">{num}</span>
      <h2>{title}</h2>
      <span className="dots" />
      <span className="hint">{hint}</span>
    </div>
  );
}
