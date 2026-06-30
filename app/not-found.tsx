export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#120A07] text-white">
      <h2 className="text-4xl font-bold text-[#D4A373] mb-4">404 - Not Found</h2>
      <p className="text-gray-400 mb-6">Sorry, the page you're looking for doesn't exist.</p>
      <a
        href="/"
        className="px-6 py-3 bg-[#D4A373] text-[#120A07] font-semibold rounded-2xl hover:opacity-90 transition-opacity"
      >
        Return Home
      </a>
    </div>
  );
}
