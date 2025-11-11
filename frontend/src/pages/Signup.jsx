import { useState } from "react";
import { signup } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { access } = await signup({ name, email, password });
      localStorage.setItem("token", access);
      nav("/");
    } catch (e: any) {
      setErr(e?.message || "signup_failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto px-4 py-12 space-y-4">
      <h2 className="text-2xl font-bold">Create account</h2>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <input className="w-full border p-3 rounded" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="w-full border p-3 rounded" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full border p-3 rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button disabled={busy} className="w-full bg-red-500 text-white py-3 rounded">{busy ? "Signing up…" : "Sign up"}</button>
    </form>
  );
}