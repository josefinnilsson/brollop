import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PRIMARY = 'rgb(165, 18, 38)';
const CREAM = 'rgb(248, 243, 234)';
const TABLE_FILL_ACTIVE = 'rgba(165, 18, 38, 0.12)';

function normalize(str) {
  return str.toLowerCase().trim();
}

const cos45 = Math.cos(Math.PI / 4);
const sin45 = Math.sin(Math.PI / 4);

function rotated(dx, dy, dir = 1) {
  return [dx * cos45 - dir * dy * sin45, dir * dx * sin45 + dy * cos45];
}

// 10 chairs around a 160×260 rect rotated ±45°
function chairs45(cx, cy, dir = 1) {
  const offsets = [
    [-45, -152], [45, -152],
    [-45,  152], [45,  152],
    [-102, -90], [-102, 0], [-102, 90],
    [ 102, -90], [ 102, 0], [ 102, 90],
  ];
  return offsets.map(([dx, dy]) => {
    const [rx, ry] = rotated(dx, dy, dir);
    return { x: cx + rx, y: cy + ry };
  });
}

// 8 chairs around a 160×260 rect rotated ±45° (2 per side)
function chairs45_8(cx, cy, dir = 1) {
  const offsets = [
    [-45, -152], [45, -152],
    [-45,  152], [45,  152],
    [-102, -45], [-102, 45],
    [ 102, -45], [ 102, 45],
  ];
  return offsets.map(([dx, dy]) => {
    const [rx, ry] = rotated(dx, dy, dir);
    return { x: cx + rx, y: cy + ry };
  });
}

// 8 chairs around a 220×130 head table
function chairsHead(cx, cy) {
  return [
    { x: cx - 45, y: cy - 87 },
    { x: cx + 45, y: cy - 87 },
    { x: cx - 45, y: cy + 87 },
    { x: cx + 45, y: cy + 87 },
    { x: cx - 132, y: cy - 35 },
    { x: cx - 132, y: cy + 35 },
    { x: cx + 132, y: cy - 35 },
    { x: cx + 132, y: cy + 35 },
  ];
}

function nameLabel(chair, cx, cy) {
  const dx = chair.x - cx;
  const dy = chair.y - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offset = 55;
  return {
    x: chair.x + (dx / len) * offset,
    y: chair.y + (dy / len) * offset,
    anchor: dx < -10 ? 'end' : dx > 10 ? 'start' : 'middle',
    baseline: dy < -10 ? 'auto' : dy > 10 ? 'hanging' : 'middle',
  };
}

// Wide layout — left tables cx=250, right cx=1550, generous row spacing
const TABLE_LAYOUT = [
  { idx: 0, cx:  900, cy:  430, type: 'head', dir:  1 },
  { idx: 1, cx:  250, cy:  200, type: 'guest', dir: -1 },
  { idx: 2, cx: 1550, cy:  200, type: 'guest', dir:  1 },
  { idx: 3, cx:  250, cy:  700, type: 'guest', dir: -1 },
  { idx: 4, cx: 1550, cy:  700, type: 'guest', dir:  1 },
  { idx: 5, cx:  250, cy: 1220, type: 'guest', dir: -1 },
  { idx: 6, cx: 1550, cy: 1220, type: 'guest', dir:  1 },
  { idx: 7, cx:  250, cy: 1740, type: 'guest', dir: -1 },
  { idx: 8, cx: 1550, cy: 1740, type: 'guest', dir:  1 },
];

function GuestLabels({ chairs, guests, cx, cy }) {
  return chairs.map((c, i) => {
    const guest = guests[i];
    if (!guest) return null;
    const { x, y, anchor, baseline } = nameLabel(c, cx, cy);
    return (
      <text key={i} x={x} y={y}
        textAnchor={anchor} dominantBaseline={baseline}
        fontSize={26} fontFamily="Lora, serif" fill={PRIMARY}>
        {guest}
      </text>
    );
  });
}

function DiamondTable({ layout, data, active }) {
  const { cx, cy, dir = 1, seats = 10 } = layout;
  const fill = active ? TABLE_FILL_ACTIVE : CREAM;
  const sw = active ? 3 : 2;
  const chairList = chairs45(cx, cy, dir);

  return (
    <g>
      {chairList.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={20} fill={fill} stroke={PRIMARY} strokeWidth={2} />
      ))}
      <rect
        x={cx - 80} y={cy - 130} width={160} height={260} rx={4}
        fill={fill} stroke={PRIMARY} strokeWidth={sw}
        transform={`rotate(${dir * 45}, ${cx}, ${cy})`}
      />
      <text x={cx} y={cy + 9} textAnchor="middle"
        fontSize={22} fontFamily="Lora, serif" fill={PRIMARY} fontWeight="700">
        {data.table}
      </text>
      <GuestLabels chairs={chairList} guests={data.guests} cx={cx} cy={cy} />
    </g>
  );
}

function HeadTable({ layout, data, active }) {
  const { cx, cy } = layout;
  const fill = active ? TABLE_FILL_ACTIVE : CREAM;
  const sw = active ? 3 : 2;
  const chairList = chairsHead(cx, cy);

  return (
    <g>
      {chairList.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={20} fill={fill} stroke={PRIMARY} strokeWidth={2} />
      ))}
      <rect
        x={cx - 110} y={cy - 65} width={220} height={130} rx={4}
        fill={fill} stroke={PRIMARY} strokeWidth={sw}
      />
      <text x={cx} y={cy + 9} textAnchor="middle"
        fontSize={22} fontFamily="Lora, serif" fill={PRIMARY} fontWeight="700">
        {data.table}
      </text>
      <GuestLabels chairs={chairList} guests={data.guests} cx={cx} cy={cy} />
    </g>
  );
}

export default function SeatingMap() {
  const [seating, setSeating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('seating')
      .select('id, table_name, guests')
      .order('id')
      .then(({ data }) => {
        if (data) setSeating(data.map((r) => ({ table: r.table_name, guests: r.guests ?? [] })));
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="content">
      <p style={{ textAlign: 'center', paddingTop: '3rem' }}>Laddar...</p>
    </div>
  );

  const searchResult = (() => {
    if (query.length < 2) return null;
    const q = normalize(query);
    for (let i = 0; i < seating.length; i++) {
      const match = seating[i].guests.find((g) => normalize(g).includes(q));
      if (match) return { guestName: match, tableIdx: i };
    }
    return 'not-found';
  })();

  const highlightIdx =
    searchResult && searchResult !== 'not-found' ? searchResult.tableIdx : null;

  return (
    <div>
      <div className="content">
        <h2>Bordsplacering</h2>
        <p>Sök efter ditt namn för att hitta ditt bord.</p>
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Sök ditt namn..."
            autoComplete="off"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(null); }}
            className="seating-search"
          />
          {searchResult === 'not-found' && (
            <div className="search-result">Inget namn hittades.</div>
          )}
          {searchResult && searchResult !== 'not-found' && (
            <div className="search-result found">
              {searchResult.guestName} sitter vid{' '}
              <span className="result-table">{seating[searchResult.tableIdx].table}</span>.
            </div>
          )}
        </div>
      </div>

      <div style={{ margin: '2rem 0 0', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox="-120 -60 2040 2100"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', minWidth: '700px', display: 'block' }}
        >
          <rect x={-120} y={-60} width={2040} height={2100} fill={CREAM} />

          {TABLE_LAYOUT.map((layout) => {
            if (!seating[layout.idx]) return null;
            const data = seating[layout.idx];
            const active = highlightIdx === layout.idx;
            const props = { layout, data, active };
            return layout.type === 'head'
              ? <HeadTable key={layout.idx} {...props} />
              : <DiamondTable key={layout.idx} {...props} />;
          })}
        </svg>
      </div>
    </div>
  );
}
