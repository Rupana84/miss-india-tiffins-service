import { useEffect, useState } from "react";
import { getMenu } from "../lib/api";

export default function Menu() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getMenu().then(setItems).catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="text-red-600">{err}</div>;
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Menu</h1>
      {items.map(m => (
        <div key={m.id} className="card">
          <div className="font-semibold">{m.name}</div>
          <div className="text-sm opacity-80">{m.description}</div>
          <div className="mt-2">₹{Number(m.priceCents/100).toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}