import { useEffect, useState } from "react";
import { createOrder } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Cart(){
  const [cart,setCart]=useState([]);
  const nav = useNavigate();
  useEffect(()=>{ setCart(JSON.parse(localStorage.getItem("cart")||"[]")); },[]);
  const total = cart.reduce((s,i)=> s + i.price_cents*i.qty, 0);

  const checkout = async ()=>{
    const token = localStorage.getItem("token");
    if(!token){ alert("Login first"); return; }
    const items = cart.map(i=>({ menuItemId:i.id, qty:i.qty }));
    const { id } = await createOrder(items, token);
    localStorage.removeItem("cart"); setCart([]);
    nav(`/order/${id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold mb-4">Your Cart</h2>
      {cart.length===0? <p>Empty.</p> :
        <>
          <ul className="divide-y">
            {cart.map(i=>(
              <li key={i.id} className="py-3 flex justify-between">
                <span>{i.name} × {i.qty}</span>
                <span>₹{((i.price_cents*i.qty)/100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between mt-4 font-semibold">
            <span>Total</span><span>₹{(total/100).toFixed(2)}</span>
          </div>
          <button onClick={checkout} className="mt-6 bg-red-500 text-white px-6 py-3 rounded-full">Checkout</button>
        </>
      }
    </div>
  );
}