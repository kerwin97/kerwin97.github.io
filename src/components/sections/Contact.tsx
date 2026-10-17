import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, GitBranch, Link, Copy, Check } from "lucide-react";
import { personal } from "../../data/resume";
import { SectionTitle } from "../ui/SectionTitle";
import { useInView } from "../../hooks/useInView";

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-1.5 text-zinc-500 hover:text-emerald-400 transition-colors text-sm"
      aria-label="Copy email address"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-emerald-400"
          >
            <Check size={14} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy size={14} />
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.span
          key={copied ? "copied" : "copy"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {copied ? "Copied!" : "Copy"}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function Contact() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="contact" className="max-w-5xl mx-auto px-6 py-24">
      <SectionTitle>
        <Mail size={24} className="text-emerald-400" />
        Contact
      </SectionTitle>
      <motion.div
        ref={ref as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center py-16"
      >
        <p className="text-zinc-400 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
          I'm open to new opportunities. Whether you have a question or just want to say hi — my inbox is always open.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={`mailto:${personal.email}`}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3 rounded transition-colors"
          >
            <Mail size={16} />
            Say Hello
          </a>
        </div>

        {/* Email with copy button */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <a
            href={`mailto:${personal.email}`}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-mono"
          >
            {personal.email}
          </a>
          <CopyEmailButton email={personal.email} />
        </div>

        <div className="flex justify-center gap-6 mt-8">
          <a
            href={`mailto:${personal.email}`}
            aria-label="Email"
            className="text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <Mail size={22} />
          </a>
          <a
            href="https://github.com/kerwin97"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <GitBranch size={22} />
          </a>
          <a
            href="https://www.linkedin.com/in/kerwinlim97/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <Link size={22} />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
