import { useEffect, useState } from "react";
import { getMenu } from "../lib/api";

export default function Menu(){
  const [items,setItems]=useState([]);
  useEffect(()=>{ getMenu().then(setItems).catch(console.error); },[]);

  const add=(p)=>{
    const cart = JSON.parse(localStorage.getItem("cart")||"[]");
    const i = cart.findIndex(x=>x.id===p.id);
    if(i>=0) cart[i].qty++; else cart.push({id:p.id,name:p.name,price_cents:p.priceCents,qty:1});
    localStorage.setItem("cart", JSON.stringify(cart));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-14">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Today’s Special Menu</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map(p=>(
          <div key={p.id} className="card hover:-translate-y-1 hover:shadow-xl transition">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-gray-900">{p.name}</h3>
              <span className="text-red-500 font-bold">₹{(p.priceCents/100).toFixed(2)}</span>
            </div>
            <p className="text-gray-600 text-sm mt-2">{p.description}</p>
            <button onClick={()=>add(p)} className="mt-5 btn-primary">Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}