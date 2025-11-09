import { useParams } from "react-router-dom";
export default function OrderStatus(){
  const { id } = useParams();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold mb-2">Order #{id}</h2>
      <p>Your order was placed. Status starts as <b>PENDING</b>.</p>
      <p className="text-sm text-gray-600 mt-2">Realtime updates can be added later with Socket.IO.</p>
    </div>
  );
}