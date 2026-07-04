"use client";

import { useEffect, useRef, useState } from "react";
import { CrisisBar } from "@/components/CrisisBar";
import { TopNav } from "@/components/TopNav";
import { FooterBar, SiteFooter } from "@/components/FooterBar";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Founder } from "@/components/sections/Founder";
import { Services } from "@/components/sections/Services";
import { Programme } from "@/components/sections/Programme";
import { Support } from "@/components/sections/Support";

const hints: Record<string, string> = {
  home: "Discover who we are and who we help",
  about: "Meet the founder behind ThrivSphere",
  founder: "Explore our wellbeing services",
  services: "See our flagship resilience programme",
  programme: "Ready when you are — book your session",
  support: "You belong here. Welcome to ThrivSphere.",
};

export default function Home() {
  const deckRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("home");

  useEffect(() => {
    const root = deckRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll("section[id]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { root, threshold: 0.5 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const navigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <CrisisBar />
      <TopNav active={active} onNavigate={navigate} />

      <div ref={deckRef} className="deck">
        <Hero onNavigate={navigate} />
        <About />
        <Founder />
        <Services />
        <Programme onNavigate={navigate} />
        <Support />
        <SiteFooter />
      </div>

      <FooterBar hint={hints[active] ?? hints.home} onBook={() => navigate("support")} />
    </>
  );
}
