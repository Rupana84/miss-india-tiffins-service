export default function Home(){
  return (
    <section className="hero-gradient">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Home-Cooked Meals<br/> Delivered to You
          </h1>
          <p className="text-lg text-gray-600 mt-4">
            Fresh, healthy, and delicious meals prepared daily.
          </p>
          <div className="mt-8 flex gap-4">
            <a href="/menu" className="btn-primary">Order Today’s Meal</a>
            <a href="/plans" className="btn-outline">View Plans</a>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex text-yellow-400">
              <span>★★★★★</span>
            </div>
            <span className="text-sm text-gray-600">4.9 from happy customers</span>
          </div>
        </div>
        <div className="relative">
          <img
            className="rounded-2xl shadow-xl w-full"
            src="https://images.unsplash.com/photo-1546069901-ba9590aed2c5?q=80&w=1200&auto=format&fit=crop"
            alt="Delicious food"
          />
          <div className="absolute -bottom-6 -left-6 card w-56">
            <p className="text-sm font-semibold">Why us</p>
            <ul className="mt-2 text-sm text-gray-600 space-y-1">
              <li>• Fresh ingredients</li>
              <li>• Daily prepared</li>
              <li>• Hygienic kitchen</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}