import { Suspense, lazy } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { Hero } from "./components/sections/Hero";

// Lazy-loaded below-the-fold sections — Parcel splits these into separate chunks
const Experience = lazy(() => import("./components/sections/Experience").then(m => ({ default: m.Experience })));
const Skills = lazy(() => import("./components/sections/Skills").then(m => ({ default: m.Skills })));
const Projects = lazy(() => import("./components/sections/Projects").then(m => ({ default: m.Projects })));
const Education = lazy(() => import("./components/sections/Education").then(m => ({ default: m.Education })));
const Contact = lazy(() => import("./components/sections/Contact").then(m => ({ default: m.Contact })));

function SectionSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-24 animate-pulse">
      <div className="h-8 w-48 bg-zinc-800 rounded mb-12" />
      <div className="space-y-4">
        <div className="h-32 bg-zinc-900 rounded-lg" />
        <div className="h-32 bg-zinc-900 rounded-lg" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={<SectionSkeleton />}>
          <Experience />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Skills />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Projects />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Education />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Contact />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
