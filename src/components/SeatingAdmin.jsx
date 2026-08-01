import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

const ADMIN_PASSWORD = import.meta.env.PUBLIC_ADMIN_PASSWORD;
const PRIMARY = 'rgb(165, 18, 38)';
const CREAM = 'rgb(248, 243, 234)';

const SEAT_COUNTS = [8, 10, 10, 10, 10, 10, 10, 10, 10];

// ── Geometry (mirrors SeatingMap exactly) ────────────────────────────────────
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
    [-102, -45], [-102, 45],
    [ 102, -45], [ 102, 45],
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

function nameLabel(chair, cx, cy) {
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
  { idx: 8, cx: 1550, cy: 1740, type: 'guest', dir:  1 },
];

// ── Name chip rendered inside SVG foreignObject ──────────────────────────────
function NameChip({ tableIdx, seatIdx, guest, dragging, dragOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onUpdate, label }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(guest);

  const isDragging = dragging?.ti === tableIdx && dragging?.si === seatIdx;
  const isOver = dragOver?.ti === tableIdx && dragOver?.si === seatIdx;

  // foreignObject is 160×44 SVG units, anchored so chip is centered on label point
  const W = 160, H = 44;
  const x = label.anchor === 'end' ? label.x - W : label.anchor === 'start' ? label.x : label.x - W / 2;
  const y = label.y - H / 2;

  function commit() {
    setEditing(false);
    onUpdate(tableIdx, seatIdx, value.trim());
  }

  const chipStyle = {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box',
    border: isOver
      ? `2px dashed ${PRIMARY}`
      : guest ? `1.5px solid ${PRIMARY}` : `1.5px dashed rgba(165,18,38,0.4)`,
    borderRadius: '4px',
    background: isOver ? 'rgba(165,18,38,0.12)' : guest ? 'rgba(165,18,38,0.07)' : 'transparent',
    cursor: guest ? 'grab' : 'pointer',
    opacity: isDragging ? 0.3 : 1,
    fontFamily: 'Lora, serif',
    fontSize: '13px',
    color: guest ? PRIMARY : 'rgba(165,18,38,0.4)',
    fontStyle: guest ? 'normal' : 'italic',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    padding: '0 6px',
    userSelect: 'none',
  };

  return (
    <foreignObject x={x} y={y} width={W} height={H} style={{ overflow: 'visible' }}>
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={{
            width: '100%', height: '100%', boxSizing: 'border-box',
            border: `2px solid ${PRIMARY}`, borderRadius: '4px',
            fontFamily: 'Lora, serif', fontSize: '13px', color: PRIMARY,
            background: CREAM, outline: 'none', padding: '0 6px',
          }}
        />
      ) : (
        <div
          draggable={!!guest}
          onDragStart={() => guest && onDragStart(tableIdx, seatIdx)}
          onDragEnd={onDragEnd}
          onDragOver={e => { e.preventDefault(); onDragOver(tableIdx, seatIdx); }}
          onDragLeave={onDragLeave}
          onDrop={e => { e.preventDefault(); onDrop(tableIdx, seatIdx); }}
          onClick={() => { setEditing(true); setValue(guest); }}
          title={guest ? 'Klicka för att redigera, dra för att flytta' : 'Klicka för att lägga till'}
          style={chipStyle}
        >
          {guest || '+ lägg till'}
        </div>
      )}
    </foreignObject>
  );
}

// ── Table shapes ─────────────────────────────────────────────────────────────
function TableShape({ layout, chairList, children }) {
  const { cx, cy, dir = 1, type } = layout;

  return (
    <g>
      {chairList.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={20} fill={CREAM} stroke={PRIMARY} strokeWidth={2} />
      ))}
      {type === 'head' ? (
        <rect x={cx - 110} y={cy - 65} width={220} height={130} rx={4}
          fill={CREAM} stroke={PRIMARY} strokeWidth={2} />
      ) : (
        <rect x={cx - 80} y={cy - 130} width={160} height={260} rx={4}
          fill={CREAM} stroke={PRIMARY} strokeWidth={2}
          transform={`rotate(${dir * 45}, ${cx}, ${cy})`} />
      )}
      <text x={cx} y={cy + 9} textAnchor="middle"
        fontSize={22} fontFamily="Lora, serif" fill={PRIMARY} fontWeight="700"
        style={{ pointerEvents: 'none' }}>
        {layout.tableName}
      </text>
      {children}
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SeatingAdmin() {
  const [authed, setAuthed] = useState(false);
  const [attempt, setAttempt] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tables, setTables] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    if (!authed) return;
    getSupabase().from('seating').select('id, table_name, guests').order('id').then(({ data }) => {
      if (data) {
        setTables(data.map((r, i) => {
          const seats = SEAT_COUNTS[i] ?? 10;
          const guests = [...(r.guests ?? [])];
          while (guests.length < seats) guests.push('');
          return { id: r.id, name: r.table_name, guests };
        }));
      }
    });
  }, [authed]);

  function login() {
    if (attempt === ADMIN_PASSWORD) { setAuthed(true); setLoginError(''); }
    else setLoginError('Fel lösenord.');
  }

  function onDragStart(ti, si) { setDragging({ ti, si }); }
  function onDragEnd() { setDragging(null); setDragOver(null); }
  function onDragOver(ti, si) { setDragOver({ ti, si }); }
  function onDragLeave() { setDragOver(null); }

  function onDrop(ti, si) {
    if (!dragging) return;
    setDragging(null); setDragOver(null);
    if (dragging.ti === ti && dragging.si === si) return;
    setTables(prev => {
      const next = prev.map(t => ({ ...t, guests: [...t.guests] }));
      const src = next[dragging.ti].guests[dragging.si];
      const dst = next[ti].guests[si] ?? '';
      next[dragging.ti].guests[dragging.si] = dst;
      next[ti].guests[si] = src;
      return next;
    });
    setSaved(false);
  }

  function onUpdate(ti, si, value) {
    setTables(prev => {
      const next = prev.map(t => ({ ...t, guests: [...t.guests] }));
      next[ti].guests[si] = value;
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    for (const table of tables) {
      await getSupabase().from('seating').update({ guests: table.guests.map(g => g.trim()) }).eq('id', table.id);
    }
    setSaving(false); setSaved(true);
  }

  if (!authed) {
    return (
      <div className="content" style={{ maxWidth: 400 }}>
        <h2>Admin</h2>
        <div style={{ marginTop: '1.5rem' }}>
          <input type="password" placeholder="Lösenord" value={attempt}
            onChange={e => setAttempt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', boxSizing: 'border-box' }} />
          {loginError && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{loginError}</p>}
          <button onClick={login} style={{ marginTop: '1rem' }}>Logga in</button>
        </div>
      </div>
    );
  }

  const chipHandlers = { onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onUpdate };

  return (
    <div>
      <div className="content">
        <h2>Redigera bordsplacering</h2>
        <p>Klicka på en plats för att redigera. Dra ett namn för att flytta det.</p>
      </div>

      <div style={{ margin: '2rem 0 0', width: '100%', overflowX: 'auto' }}>
        <svg viewBox="-120 -60 2040 2100" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', minWidth: '700px', display: 'block' }}>
          <rect x={-120} y={-60} width={2040} height={2100} fill={CREAM} />

          {TABLE_LAYOUT.map((layout) => {
            const table = tables[layout.idx];
            if (!table) return null;
            const { cx, cy, type, dir } = layout;
            const chairList = type === 'head' ? chairsHead(cx, cy) : chairs45(cx, cy, dir);

            return (
              <TableShape key={layout.idx} layout={{ ...layout, tableName: table.name }} chairList={chairList}>
                {chairList.map((chair, si) => {
                  const label = nameLabel(chair, cx, cy);
                  return (
                    <NameChip
                      key={si}
                      tableIdx={layout.idx}
                      seatIdx={si}
                      guest={table.guests[si] ?? ''}
                      label={label}
                      dragging={dragging}
                      dragOver={dragOver}
                      {...chipHandlers}
                    />
                  );
                })}
              </TableShape>
            );
          })}
        </svg>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '3rem' }}>
        <button onClick={save} disabled={saving} style={{ maxWidth: 280 }}>
          {saving ? 'Sparar...' : 'Spara alla ändringar'}
        </button>
        {saved && <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>Sparat!</p>}
      </div>
    </div>
  );
}
