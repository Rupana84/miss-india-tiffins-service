const API = import.meta.env.VITE_API_URL;

async function fetchJSON(path, opts={}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type":"application/json", ...(opts.headers||{}) },
    ...opts
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const signup = (data)=> fetchJSON("/auth/signup",{method:"POST",body:JSON.stringify(data)});
export const login  = (data)=> fetchJSON("/auth/login" ,{method:"POST",body:JSON.stringify(data)});
export const me     = (tok)=> fetchJSON("/me",{headers:{Authorization:`Bearer ${tok}`}});
export const getMenu= ()=> fetchJSON("/menu");
export const createOrder = (items,tok)=> fetchJSON("/orders",{
  method:"POST", body:JSON.stringify({items}),
  headers:{Authorization:`Bearer ${tok}`}
});