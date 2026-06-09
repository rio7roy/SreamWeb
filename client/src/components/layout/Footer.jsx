export default function Footer() {
  return (
    <footer className="bg-white border-t border-black/[0.03] py-8">
      <div className="max-w-max-width mx-auto flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop w-full gap-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface">
          © 2026 STREAM Ecosystem
        </span>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {['Privacy', 'Terms', 'Standards', 'Accessibility'].map((link) => (
            <a
              key={link}
              href="#"
              className="text-[11px] font-bold hover:text-primary transition-all uppercase tracking-widest text-on-surface"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
