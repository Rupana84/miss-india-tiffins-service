import { useState } from "react";
import { signup } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const { access } = await signup({ name, email, password });
      localStorage.setItem("token", access);
      nav("/");
    } catch (ex) {
      setErr("Signup failed");
      console.error(ex);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto px-4 py-12 space-y-4">
      <h2 className="text-2xl font-bold">Create account</h2>
      {err && <div className="text-red-600">{err}</div>}
      <input className="w-full border p-3 rounded" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
      <input className="w-full border p-3 rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input className="w-full border p-3 rounded" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <button className="w-full bg-red-500 text-white py-3 rounded">Sign up</button>
    </form>
  );
}