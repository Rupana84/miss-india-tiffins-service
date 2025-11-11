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
    <form
      onSubmit={submit}
      className="max-w-md mx-auto px-4 py-12 space-y-4"
    >
      <h2 className="text-2xl font-bold text-center">Create Account</h2>

      {err && (
        <div className="text-red-600 bg-red-100 p-2 rounded text-center">
          {err}
        </div>
      )}

      <input
        className="w-full border p-3 rounded"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <input
        className="w-full border p-3 rounded"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        className="w-full border p-3 rounded"
        type="password"
        placeholder="Password (min 6 chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
        required
      />

      <button
        type="submit"
        className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded transition"
      >
        Sign up
      </button>
    </form>
  );
}