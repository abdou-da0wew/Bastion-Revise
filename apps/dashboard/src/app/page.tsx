import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/landing/footer";
import {
  Benchmarks, Capabilities, Cta, Faq, HowItWorks, Integrations, Library,
  Logos, Manifesto, Posts, Security, Stories, Teams,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Library />
        <Logos />
        <Capabilities />
        <Manifesto />
        <Security />
        <Benchmarks />
        <Teams />
        <Stories />
        <HowItWorks />
        <Integrations />
        <Posts />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
