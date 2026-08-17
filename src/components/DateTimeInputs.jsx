import { useEffect, useState } from "react";

// Власні поля дати й часу з гарантованим форматом (не залежать від локалі браузера):
// час — 24 години (ГГ:ХХ), дата — День / Місяць / Рік.
const selCls =
  "h-10 rounded-lg border border-border bg-bg px-2 text-sm outline-none focus:border-brand-500";
const pad = (n) => String(n).padStart(2, "0");

// value / onChange у форматі "HH:MM" (24 год). Хвилини кроком 15.
export function TimeSelect({ value = "", onChange }) {
  const [hh, setHh] = useState("");
  const [mm, setMm] = useState("");

  useEffect(() => {
    const [h = "", m = ""] = value ? value.split(":") : [];
    setHh(h);
    setMm(m);
  }, [value]);

  const setH = (h) => {
    setHh(h);
    onChange(h && mm ? `${h}:${mm}` : "");
  };
  const setM = (m) => {
    setMm(m);
    onChange(hh && m ? `${hh}:${m}` : "");
  };

  return (
    <div className="flex items-center gap-1.5">
      <select className={selCls} value={hh} onChange={(e) => setH(e.target.value)} aria-label="Години">
        <option value="" disabled>
          ГГ
        </option>
        {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="font-medium text-muted">:</span>
      <select className={selCls} value={mm} onChange={(e) => setM(e.target.value)} aria-label="Хвилини">
        <option value="" disabled>
          ХХ
        </option>
        {["00", "15", "30", "45"].map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

// value / onChange у форматі "YYYY-MM-DD". Показ — День / Місяць / Рік.
export function DateSelect({ value = "", onChange }) {
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");

  useEffect(() => {
    const [yy = "", mm = "", dd = ""] = value ? value.split("-") : [];
    setY(yy);
    setM(mm);
    setD(dd);
  }, [value]);

  const emit = (dd, mm, yy) => onChange(dd && mm && yy ? `${yy}-${mm}-${dd}` : "");
  const onD = (v) => {
    setD(v);
    emit(v, m, y);
  };
  const onM = (v) => {
    setM(v);
    emit(d, v, y);
  };
  const onY = (v) => {
    setY(v);
    emit(d, m, v);
  };

  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1].map(String);

  return (
    <div className="flex items-center gap-1.5">
      <select className={selCls} value={d} onChange={(e) => onD(e.target.value)} aria-label="День">
        <option value="" disabled>
          ДД
        </option>
        {Array.from({ length: 31 }, (_, i) => pad(i + 1)).map((dd) => (
          <option key={dd} value={dd}>
            {dd}
          </option>
        ))}
      </select>
      <span className="text-muted">/</span>
      <select className={selCls} value={m} onChange={(e) => onM(e.target.value)} aria-label="Місяць">
        <option value="" disabled>
          ММ
        </option>
        {Array.from({ length: 12 }, (_, i) => pad(i + 1)).map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
      <span className="text-muted">/</span>
      <select className={selCls} value={y} onChange={(e) => onY(e.target.value)} aria-label="Рік">
        <option value="" disabled>
          РРРР
        </option>
        {years.map((yy) => (
          <option key={yy} value={yy}>
            {yy}
          </option>
        ))}
      </select>
    </div>
  );
}
