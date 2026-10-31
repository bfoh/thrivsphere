"use client";

import { useEffect, useRef, useState } from "react";
import { CrisisBar } from "@/components/CrisisBar";
import { TopNav } from "@/components/TopNav";
import { FooterBar, SiteFooter } from "@/components/FooterBar";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Team } from "@/components/sections/Team";
import { Services } from "@/components/sections/Services";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Support } from "@/components/sections/Support";
import type { Service } from "@/data/site";

const hints: Record<string, string> = {
  home: "Discover who we are and how we can help",
  about: "Meet our Registered Mental Health Nurses",
  team: "Explore our wellbeing services",
  services: "See how our service works",
  "how-it-works": "Ready when you are — book an appointment",
  support: "Get in touch, in confidence",
};

/** The homepage's full-screen sections, with the floating hint bar that follows them. */
export function HomeDeck({ services }: { services: Service[] }) {
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

  return (
    <>
      <CrisisBar />
      <TopNav />

      <div ref={deckRef} className="deck">
        <Hero />
        <About />
        <Team />
        <Services services={services} />
        <HowItWorks />
        <Support />
        <SiteFooter />
      </div>

      <FooterBar hint={hints[active] ?? hints.home} />
    </>
  );
}
