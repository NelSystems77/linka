export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full
                        bg-brand-600/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[300px] h-[300px] rounded-full
                        bg-violet-600/10 blur-[80px]" />
      </div>

      <div className="relative flex flex-col items-center animate-fade-in">
        {/* Logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-3xl scale-125 animate-glow" />
          <img
            src="/icons/logo.png"
            alt="Linka"
            className="relative w-36 h-36 object-contain drop-shadow-2xl"
            style={{
              maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 80%)',
            }}
          />
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce-dot"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>

      {/* Bottom label */}
      <p className="absolute bottom-8 text-[10px] text-slate-700 tracking-widest uppercase">
        Cifrado extremo a extremo
      </p>
    </div>
  )
}
