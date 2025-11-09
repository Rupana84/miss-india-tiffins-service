import { useState } from "react";
import { login } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Login(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const nav = useNavigate();
  const submit = async e=>{
    e.preventDefault();
    const { access } = await login({email,password});
    localStorage.setItem("token", access);
    nav("/");
  };
  return (
    <form onSubmit={submit} className="max-w-md mx-auto px-4 py-12 space-y-4">
      <h2 className="text-2xl font-bold">Login</h2>
      <input className="w-full border p-3 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
      <input className="w-full border p-3 rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button className="w-full bg-red-500 text-white py-3 rounded">Login</button>
    </form>
  );
}