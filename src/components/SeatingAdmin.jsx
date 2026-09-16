import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '../lib/supabase';

const ADMIN_PASSWORD = import.meta.env.PUBLIC_ADMIN_PASSWORD;
const PRIMARY = 'rgb(165, 18, 38)';
const CREAM = 'rgb(248, 243, 234)';

const SEAT_COUNTS = [8, 10, 10, 10, 10, 10, 10, 10, 8];

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

function emptySeat() {
  return { name: '', dietary: '', highchairAfter: false };
}

// Returns gaps between chairs in clockwise perimeter order.
// Each gap has the midpoint position and the seatIdx that "owns" it (highchairAfter).
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

function HighchairToggle({ gap, active, onToggle }) {
  const { mid, seatIdx } = gap;
  return (
    <g onClick={() => onToggle(seatIdx)} style={{ cursor: 'pointer' }}>
      <circle cx={mid.x} cy={mid.y} r={14}
        fill={active ? PRIMARY : CREAM}
        stroke={PRIMARY} strokeWidth={1.5}
        strokeDasharray={active ? 'none' : '3 2'}
      />
      {active ? (
        <text x={mid.x} y={mid.y + 5} textAnchor="middle" fontSize={16} style={{ userSelect: 'none' }}>👶</text>
      ) : (
        <>
          <line x1={mid.x - 6} y1={mid.y} x2={mid.x + 6} y2={mid.y} stroke={PRIMARY} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={mid.x} y1={mid.y - 6} x2={mid.x} y2={mid.y + 6} stroke={PRIMARY} strokeWidth={1.5} strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function SeatChip({ ti, si, seat, isSelected, isDragging, isDropTarget, onSelect, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, chair, cx, cy }) {
  const W = 160;
  const H = seat.dietary ? 64 : 44;
  const pos = chipPos(chair, cx, cy);
  const x = pos.anchor === 'end' ? pos.x - W : pos.anchor === 'start' ? pos.x : pos.x - W / 2;
  const y = pos.y - H / 2;

  const bg = isDropTarget ? 'rgba(165,18,38,0.18)'
    : isSelected ? 'rgba(165,18,38,0.15)'
    : seat.dietary ? 'rgba(165,18,38,0.09)'
    : seat.name ? 'rgba(165,18,38,0.04)'
    : 'transparent';

  const border = (isDropTarget || isSelected)
    ? `2.5px solid ${PRIMARY}`
    : seat.name ? `1.5px solid ${PRIMARY}`
    : `1.5px dashed rgba(165,18,38,0.35)`;

  return (
    <foreignObject x={x} y={y} width={W} height={H} style={{ overflow: 'visible' }}>
      <div
        draggable={!!seat.name}
        onDragStart={() => seat.name && onDragStart(ti, si)}
        onDragEnd={onDragEnd}
        onDragOver={e => { e.preventDefault(); onDragOver(ti, si); }}
        onDragLeave={onDragLeave}
        onDrop={e => { e.preventDefault(); onDrop(ti, si); }}
        onClick={() => onSelect(ti, si)}
        title={seat.name ? 'Klicka för att redigera, dra för att flytta' : 'Klicka för att lägga till'}
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          boxSizing: 'border-box', gap: '2px',
          border, borderRadius: '4px', background: bg,
          cursor: seat.name ? 'grab' : 'pointer',
          opacity: isDragging ? 0.3 : 1,
          padding: '4px 8px', userSelect: 'none',
        }}
      >
        <span style={{
          fontFamily: 'Lora, serif', fontSize: '13px', color: PRIMARY,
          fontWeight: isSelected ? '700' : '400',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '144px',
        }}>
          {seat.name || '+ lägg till'}
        </span>
        {seat.dietary && (
          <span style={{
            fontFamily: 'Lora, serif', fontSize: '11px', color: PRIMARY,
            fontStyle: 'italic', opacity: 0.8,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '144px',
          }}>
            {seat.dietary}
          </span>
        )}
      </div>
    </foreignObject>
  );
}

function TableGroup({ layout, table, selected, dragging, dragOver, handlers, onToggleHighchair }) {
  const { cx, cy, dir = 1, type } = layout;
  const chairList = type === 'head' ? chairsHead(cx, cy) : type === 'guest8' ? chairs45_8(cx, cy, dir) : chairs45(cx, cy, dir);

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
        {table.name}
      </text>
      {chairList.map((chair, si) => (
        <SeatChip
          key={si} ti={layout.idx} si={si}
          seat={table.seats[si] ?? emptySeat()}
          isSelected={selected?.ti === layout.idx && selected?.si === si}
          isDragging={dragging?.ti === layout.idx && dragging?.si === si}
          isDropTarget={dragOver?.ti === layout.idx && dragOver?.si === si}
          chair={chair} cx={cx} cy={cy}
          {...handlers}
        />
      ))}
      {perimeterGaps(chairList, cx, cy).map((gap) => (
        <HighchairToggle
          key={`hc-${gap.seatIdx}`}
          gap={gap}
          active={!!table.seats[gap.seatIdx]?.highchairAfter}
          onToggle={(seatIdx) => onToggleHighchair(layout.idx, seatIdx)}
        />
      ))}
    </g>
  );
}

function EditPanel({ tables, selected, onChange, onClose }) {
  if (!selected) return null;
  const { ti, si } = selected;
  const table = tables[ti];
  const seat = table.seats[si] ?? emptySeat();

  return (
    <div style={{
      maxWidth: '500px', margin: '2rem auto 0',
      border: `2px solid ${PRIMARY}`, borderRadius: '6px', padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, padding: 0, fontSize: '1.25rem' }}>
          {table.name} — plats {si + 1}
        </h3>
        <button onClick={onClose} style={{ width: 'auto', margin: 0, padding: '0.3rem 0.8rem', fontSize: '0.9rem' }}>
          Klar
        </button>
      </div>
      <label style={{ display: 'block', marginBottom: '1rem' }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: '0.9rem', display: 'block', marginBottom: '0.35rem' }}>Namn</span>
        <input
          type="text"
          value={seat.name}
          placeholder="Gästens namn"
          onChange={e => onChange(ti, si, 'name', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontFamily: 'Lora, serif', fontSize: '0.9rem', display: 'block', marginBottom: '0.35rem' }}>Allergier / specialkost</span>
        <input
          type="text"
          value={seat.dietary}
          placeholder="T.ex. glutenfri, vegan, nötallergi..."
          onChange={e => onChange(ti, si, 'dietary', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </label>
    </div>
  );
}

export default function SeatingAdmin() {
  const [authed, setAuthed] = useState(false);
  const [attempt, setAttempt] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tables, setTables] = useState([]);
  const tablesRef = useRef([]);
  const [saveState, setSaveState] = useState('idle');
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => { tablesRef.current = tables; }, [tables]);

  useEffect(() => {
    if (!authed) return;
    getSupabase()
      .from('seating')
      .select('id, table_name, seat_data')
      .order('id')
      .then(({ data, error }) => {
        if (error) { console.error(error); return; }
        if (data) {
          setTables(data.map((r, i) => {
            const count = SEAT_COUNTS[i] ?? 10;
            const seats = [...(r.seat_data ?? [])];
            while (seats.length < count) seats.push(emptySeat());
            return { id: r.id, name: r.table_name, seats };
          }));
        }
      });
  }, [authed]);

  function login() {
    if (attempt === ADMIN_PASSWORD) { setAuthed(true); setLoginError(''); }
    else setLoginError('Fel lösenord.');
  }

  async function saveTable(ti) {
    const tableData = tablesRef.current[ti];
    if (!tableData) return;
    setSaveState('saving');
    const seat_data = tableData.seats.map(s => ({
      name: s.name.trim(),
      dietary: s.dietary.trim(),
      highchairAfter: s.highchairAfter ?? false,
    }));
    const { error } = await getSupabase()
      .from('seating')
      .update({ seat_data })
      .eq('id', tableData.id);
    if (error) { console.error(error); setSaveState('error'); }
    else setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2000);
  }

  function onSelect(ti, si) {
    if (selected) saveTable(selected.ti);
    setSelected(prev => (prev?.ti === ti && prev?.si === si) ? null : { ti, si });
  }

  function onDragStart(ti, si) { setDragging({ ti, si }); }
  function onDragEnd() { setDragging(null); setDragOver(null); }
  function onDragOver(ti, si) { setDragOver({ ti, si }); }
  function onDragLeave() { setDragOver(null); }

  function onDrop(ti, si) {
    if (!dragging) return;
    const src = { ...dragging };
    setDragging(null); setDragOver(null);
    if (src.ti === ti && src.si === si) return;
    setTables(prev => {
      const next = prev.map(t => ({ ...t, seats: t.seats.map(s => ({ ...s })) }));
      const srcSeat = { ...next[src.ti].seats[src.si] };
      const dstSeat = { ...next[ti].seats[si] };
      next[src.ti].seats[src.si] = dstSeat;
      next[ti].seats[si] = srcSeat;
      return next;
    });
    setTimeout(() => {
      saveTable(src.ti);
      if (ti !== src.ti) saveTable(ti);
    }, 0);
  }

  function onChange(ti, si, field, value) {
    setTables(prev => {
      const next = prev.map(t => ({ ...t, seats: t.seats.map(s => ({ ...s })) }));
      next[ti].seats[si][field] = value;
      return next;
    });
  }

  function onToggleHighchair(ti, si) {
    setTables(prev => {
      const next = prev.map(t => ({ ...t, seats: t.seats.map(s => ({ ...s })) }));
      next[ti].seats[si].highchairAfter = !next[ti].seats[si].highchairAfter;
      return next;
    });
    setTimeout(() => saveTable(ti), 0);
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

  const mapHandlers = { onSelect, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop };

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
            return (
              <TableGroup key={layout.idx} layout={layout} table={table}
                selected={selected} dragging={dragging} dragOver={dragOver}
                handlers={mapHandlers} onToggleHighchair={onToggleHighchair} />
            );
          })}
        </svg>
      </div>

      <EditPanel
        tables={tables} selected={selected} onChange={onChange}
        onClose={() => { if (selected) saveTable(selected.ti); setSelected(null); }}
      />

      <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '3rem', minHeight: '2rem' }}>
        {saveState === 'saving' && <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>Sparar...</p>}
        {saveState === 'saved' && <p style={{ fontSize: '0.9rem' }}>Sparat!</p>}
        {saveState === 'error' && <p style={{ fontSize: '0.9rem', color: 'red' }}>Fel vid sparning — kontrollera konsolen.</p>}
      </div>
    </div>
  );
}
