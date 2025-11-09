import { Routes, Route, Link, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Menu from "./pages/Menu.jsx";
import Cart from "./pages/Cart.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import OrderStatus from "./pages/OrderStatus.jsx";
import { useState } from "react";

export default function App() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem("token");
  const logout = () => {
    localStorage.removeItem("token");
    nav("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-xl text-gray-900">
            <span className="text-red-500">Miss. India</span> Tiffins Service
          </Link>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor">
              <path strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden md:flex gap-6 items-center text-sm">
            <Link to="/menu" className="hover:text-red-500">
              Menu
            </Link>
            <Link to="/cart" className="hover:text-red-500">
              Cart
            </Link>
            {!token ? (
              <>
                <Link
                  to="/login"
                  className="btn-primary text-white px-4 py-2 rounded-full"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn-outline px-4 py-2 rounded-full"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <button
                onClick={logout}
                className="btn-outline px-4 py-2 rounded-full"
              >
                Logout
              </button>
            )}
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t">
            <div className="px-4 py-3 space-y-2">
              <Link to="/menu" onClick={() => setOpen(false)} className="block">
                Menu
              </Link>
              <Link to="/cart" onClick={() => setOpen(false)} className="block">
                Cart
              </Link>
              {!token ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="block"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/order/:id" element={<OrderStatus />} />
      </Routes>

      <footer className="mt-16 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 py-8 flex justify-between">
          <p>© {new Date().getFullYear()} Miss. India Tiffins Service</p>
          <p>Fresh. Hygienic. Home-cooked.</p>
        </div>
      </footer>
    </div>
  );
}
