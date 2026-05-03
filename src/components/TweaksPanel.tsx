'use client';

export type Accent = { name: string; hex: string; strong: string; soft: string; line: string };

export const ACCENTS: Accent[] = [
  { name: 'Bitcoin Orange', hex: '#F2A900', strong: '#E89100', soft: '#FFF4DC', line: 'rgba(242,169,0,0.15)' },
  { name: 'Saffron',        hex: '#E77B1D', strong: '#C86511', soft: '#FCE9D6', line: 'rgba(231,123,29,0.15)' },
  { name: 'Amber',          hex: '#D98F1C', strong: '#B37416', soft: '#FBEBCF', line: 'rgba(217,143,28,0.15)' },
  { name: 'Crimson',        hex: '#C84A3F', strong: '#A33A2F', soft: '#F5DCD8', line: 'rgba(200,74,63,0.15)' },
  { name: 'Forest',         hex: '#2E7D5B', strong: '#24634A', soft: '#D9EBDF', line: 'rgba(46,125,91,0.15)' },
  { name: 'Ink',            hex: '#2B3A66', strong: '#1F2B4D', soft: '#DBE0EE', line: 'rgba(43,58,102,0.15)' },
];

type Props = {
  onClose: () => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
};

export default function TweaksPanel({ onClose, accent, setAccent }: Props) {
  return (
    <div className="tweaks-panel">
      <h4>Tweaks <button onClick={onClose}>✕</button></h4>
      <div className="tweaks-label">Accent color</div>
      <div className="swatches">
        {ACCENTS.map((a) => (
          <div
            key={a.hex}
            className={'swatch' + (accent.hex === a.hex ? ' selected' : '')}
            style={{ background: a.hex }}
            title={a.name}
            onClick={() => setAccent(a)}
          />
        ))}
      </div>
      <div className="tweaks-label" style={{ marginTop: 8 }}>Selected · {accent.name}</div>
    </div>
  );
}
