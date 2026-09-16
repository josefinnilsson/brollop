import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

const PRIMARY = 'rgb(165, 18, 38)';
const CREAM = 'rgb(248, 243, 234)';
const HIGHLIGHT_FILL = 'rgba(165, 18, 38, 0.12)';

function normalize(str) {
  return str.toLowerCase().trim();
}

const cos45 = Math.cos(Math.PI / 4);
const sin45 = Math.sin(Math.PI / 4);

function rotated(dx, dy, dir = 1) {
  return [dx * cos45 - dir * dy * sin45, dir * dx * sin45 + dy * cos45];
}

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

function chairs45_8(cx, cy, dir = 1) {
  const offsets = [
    [-45, -152], [45, -152],
    [-45,  152], [45,  152],
    [-102, -65], [-102, 65],
    [ 102, -65], [ 102, 65],
  ];
  return offsets.map(([dx, dy]) => {
    const [rx, ry] = rotated(dx, dy, dir);
    return { x: cx + rx, y: cy + ry };
  });
}

function chairsHead(cx, cy) {
  return [
    { x: cx - 45, y: cy - 87 }, { x: cx + 45, y: cy - 87 },
    { x: cx - 45, y: cy + 87 }, { x: cx + 45, y: cy + 87 },
    { x: cx - 132, y: cy - 35 }, { x: cx - 132, y: cy + 35 },
    { x: cx + 132, y: cy - 35 }, { x: cx + 132, y: cy + 35 },
  ];
}

function chipPos(chair, cx, cy) {
  const dx = chair.x - cx;
  const dy = chair.y - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offset = 55;
  return {
    x: chair.x + (dx / len) * offset,
    y: chair.y + (dy / len) * offset,
    anchor: dx < -10 ? 'end' : dx > 10 ? 'start' : 'middle',
  };
}

const TABLE_LAYOUT = [
  { idx: 0, cx:  900, cy:  430, type: 'head',  dir:  1 },
  { idx: 1, cx:  250, cy:  200, type: 'guest', dir: -1 },
  { idx: 2, cx: 1550, cy:  200, type: 'guest', dir:  1 },
  { idx: 3, cx:  250, cy:  700, type: 'guest', dir: -1 },
  { idx: 4, cx: 1550, cy:  700, type: 'guest', dir:  1 },
  { idx: 5, cx:  250, cy: 1220, type: 'guest', dir: -1 },
  { idx: 6, cx: 1550, cy: 1220, type: 'guest', dir:  1 },
  { idx: 7, cx:  250, cy: 1740, type: 'guest', dir: -1 },
  { idx: 8, cx: 1550, cy: 1740, type: 'guest8', dir:  1 },
];

const CHARS_PER_LINE = 18;

function lineCount(text, charsPerLine = CHARS_PER_LINE) {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function chipHeight(guest, dietary) {
  const nameLines = lineCount(guest);
  const dietLines = dietary ? lineCount(dietary, 22) : 0;
  return 12 + nameLines * 22 + (dietLines > 0 ? 4 + dietLines * 18 : 0);
}

function SeatChip({ chair, cx, cy, guest, dietary, highlighted }) {
  if (!guest) return null;
  const W = 160;
  const H = chipHeight(guest, dietary);
  const pos = chipPos(chair, cx, cy);
  const x = pos.anchor === 'end' ? pos.x - W : pos.anchor === 'start' ? pos.x : pos.x - W / 2;
  const y = pos.y - H / 2;

  return (
    <foreignObject x={x} y={y} width={W} height={H} style={{ overflow: 'visible' }}>
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box',
        border: highlighted ? `2.5px solid ${PRIMARY}` : `1.5px solid ${PRIMARY}`,
        borderRadius: '4px',
        background: highlighted ? HIGHLIGHT_FILL : dietary ? 'rgba(165,18,38,0.08)' : 'rgba(165,18,38,0.04)',
        padding: '4px 8px',
        gap: '2px',
      }}>
        <span style={{
          fontFamily: 'Lora, serif', fontSize: '13px',
          color: PRIMARY, fontWeight: highlighted ? '700' : '400',
          textAlign: 'center', wordBreak: 'break-word',
          maxWidth: '144px',
        }}>
          {guest}
        </span>
        {dietary && (
          <span style={{
            fontFamily: 'Lora, serif', fontSize: '11px',
            color: PRIMARY, fontStyle: 'italic', opacity: 0.8,
            textAlign: 'center', wordBreak: 'break-word',
            maxWidth: '144px',
          }}>
            {dietary}
          </span>
        )}
      </div>
    </foreignObject>
  );
}

function perimeterGaps(chairs, cx, cy) {
  const sorted = chairs
    .map((c, i) => ({ c, i, angle: Math.atan2(c.y - cy, c.x - cx) }))
    .sort((a, b) => a.angle - b.angle);
  return sorted.map((item, pi) => {
    const next = sorted[(pi + 1) % sorted.length];
    return {
      seatIdx: item.i,
      mid: { x: (item.c.x + next.c.x) / 2, y: (item.c.y + next.c.y) / 2 },
    };
  });
}

function HighchairMarker({ mid }) {
  return (
    <g>
      <circle cx={mid.x} cy={mid.y} r={14} fill={PRIMARY} stroke={PRIMARY} strokeWidth={1.5} />
      <text x={mid.x} y={mid.y + 5} textAnchor="middle" fontSize={16} style={{ userSelect: 'none' }}>👶</text>
    </g>
  );
}


function TableGroup({ layout, data, active }) {
  const { cx, cy, dir = 1, type } = layout;
  const fill = active ? HIGHLIGHT_FILL : CREAM;
  const sw = active ? 3 : 2;
  const chairList = type === 'head' ? chairsHead(cx, cy) : type === 'guest8' ? chairs45_8(cx, cy, dir) : chairs45(cx, cy, dir);

  return (
    <g>
      {chairList.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={20} fill={fill} stroke={PRIMARY} strokeWidth={2} />
      ))}
      {type === 'head' ? (
        <rect x={cx - 110} y={cy - 65} width={220} height={130} rx={4}
          fill={fill} stroke={PRIMARY} strokeWidth={sw} />
      ) : (
        <rect x={cx - 80} y={cy - 130} width={160} height={260} rx={4}
          fill={fill} stroke={PRIMARY} strokeWidth={sw}
          transform={`rotate(${dir * 45}, ${cx}, ${cy})`} />
      )}
      <text x={cx} y={cy + 9} textAnchor="middle"
        fontSize={22} fontFamily="Lora, serif" fill={PRIMARY} fontWeight="700">
        {data.table}
      </text>
      {chairList.map((chair, i) => (
        <SeatChip
          key={i}
          chair={chair} cx={cx} cy={cy}
          guest={data.seats[i]?.name ?? ''}
          dietary={data.seats[i]?.dietary ?? ''}
          highlighted={active}
        />
      ))}
      {perimeterGaps(chairList, cx, cy).map((gap) =>
        data.seats[gap.seatIdx]?.highchairAfter
          ? <HighchairMarker key={`hc-${gap.seatIdx}`} mid={gap.mid} />
          : null
      )}
    </g>
  );
}

export default function SeatingMap() {
  const [seating, setSeating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getSupabase()
      .from('seating')
      .select('id, table_name, seat_data')
      .order('id')
      .then(({ data }) => {
        if (data) setSeating(data.map((r) => ({
          table: r.table_name,
          seats: r.seat_data ?? [],
        })));
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
      const match = seating[i].seats.find((s) => normalize(s.name).includes(q));
      if (match) return { guestName: match.name, tableIdx: i };
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
            onChange={(e) => setQuery(e.target.value)}
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
            return (
              <TableGroup
                key={layout.idx}
                layout={layout}
                data={seating[layout.idx]}
                active={highlightIdx === layout.idx}
              />
            );
          })}
        </svg>
      </div>

    </div>
  );
}
