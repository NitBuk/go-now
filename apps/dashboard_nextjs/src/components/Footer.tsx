import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="max-w-lg mx-auto px-4 pb-6 pt-8">
      <a
        href="https://github.com/NitBuk"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
      >
        <Github size={14} />
        <span className="text-[11px] font-medium">Built by NitBuk</span>
      </a>
    </footer>
  );
}
