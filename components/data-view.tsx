'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { DataView, dataViews, inDataView } from '@/lib/workflow';
const Context = createContext<{
  view: DataView;
  setView: (s: DataView) => void;
  includes: (r: any) => boolean;
}>({
  view: 'Operational',
  setView: () => {},
  includes: (r) => inDataView(r, 'Operational'),
});
export function DataViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<DataView>('Operational');
  useEffect(() => {
    const saved = localStorage.getItem('erp-data-view');
    if (dataViews.includes(saved as DataView)) setView(saved as DataView);
  }, []);
  return (
    <Context.Provider
      value={{
        view,
        setView: (v) => {
          setView(v);
          localStorage.setItem('erp-data-view', v);
        },
        includes: (r) => inDataView(r, view),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useDataView = () => useContext(Context);
export function DataViewSelect() {
  const { view, setView } = useDataView();
  return (
    <label className="data-view-select">
      Data view
      <select
        value={view}
        onChange={(e) => setView(e.target.value as DataView)}
      >
        {dataViews.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
}
