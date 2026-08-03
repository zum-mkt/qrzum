export function HeroBackdrop() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg width='13' height='13' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='8' height='8' x='2.5' y='2.5' fill='white' fill-opacity='0.10' rx='1'/%3E%3C/svg%3E\")",
        backgroundSize: "13px 13px",
        backgroundRepeat: "repeat",
        maskImage: "linear-gradient(155deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.1) 100%)",
        WebkitMaskImage: "linear-gradient(155deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.1) 100%)",
      }}
    />
  );
}
