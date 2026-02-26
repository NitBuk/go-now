import type { Metadata } from "next";
import AboutView from "@/components/AboutView";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "About — Go Now",
};

export default function AboutPage() {
  return (
    <PageTransition>
      <AboutView />
    </PageTransition>
  );
}
