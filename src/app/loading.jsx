export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[70vh] w-full">
      {/* De Neon Spinner */}
      <div className="relative w-20 h-20 mb-8">
        {/* Buitenste trage ring */}
        <div className="absolute inset-0 border-4 border-border-main rounded-full"></div>
        {/* Binnenste snelle neon ring */}
        <div className="absolute inset-0 border-4 border-transparent border-t-neon-blue border-r-neon-blue rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.4)]"></div>
      </div>
      
      {/* Laad tekst */}
      <h2 className="text-2xl font-bold text-text-main animate-pulse mb-2">
        Omgeving voorbereiden...
      </h2>
      <p className="text-neon-blue font-mono text-sm tracking-widest">
        {"< LOADING />"}
      </p>
    </div>
  );
}