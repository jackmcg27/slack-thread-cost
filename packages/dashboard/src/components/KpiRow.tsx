export interface KpiItem {
  label: string;
  value: string;
}

export function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="kpi-row">
      {items.map((item) => (
        <div className="kpi-tile" key={item.label}>
          <div className="kpi-tile__value">{item.value}</div>
          <div className="kpi-tile__label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
