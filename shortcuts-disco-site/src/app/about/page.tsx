import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllShortcuts } from "@/lib/shortcuts";
import { createCanonical, createOpenGraph } from "@/lib/seo-utils";

export const metadata: Metadata = {
  title: "About Hotkys - Keyboard Shortcuts Database",
  description:
    "Hotkys is an open-source keyboard shortcuts database for macOS, Windows, and Linux applications. Browse and search them in one place.",
  alternates: createCanonical("/about"),
  openGraph: createOpenGraph(
    "/about",
    "About Hotkys - Keyboard Shortcuts Database",
    "Hotkys is an open-source keyboard shortcuts database for macOS, Windows, and Linux applications. Browse and search them in one place.",
  ),
};

export default function About() {
  const appCount = getAllShortcuts().applications.length;

  return (
    <div className="mx-auto max-w-6xl">
      <section
        aria-labelledby="about-title"
        className="hero-enter grid items-center gap-6 pb-10 md:grid-cols-[1.2fr_1fr] md:gap-12"
      >
        <div className="py-4 md:py-6">
          <p className="mb-5 text-sm font-medium text-muted-foreground">
            About Hotkys
          </p>
          <h1
            id="about-title"
            className="text-[clamp(2.75rem,5.5vw,4.25rem)] leading-[1.06] font-semibold tracking-[-0.065em]"
          >
            Small shortcuts.{" "}
            <span className="block text-brand">Big difference.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            A home for the keyboard shortcuts that make everyday work feel
            effortless.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-xl">
            <Link href="/#applications">
              Find your app{" "}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <Image
          src="/media/keycaps-hero.webp"
          alt="Q, W, E, A, and S keycaps in staggered keyboard rows, with an orange A key"
          width={1280}
          height={853}
          preload
          sizes="(max-width: 767px) 85vw, 480px"
          className="mx-auto h-48 w-auto object-contain sm:h-64 md:h-auto md:w-full"
        />
      </section>

      <dl className="grid gap-6 border-y py-6 sm:grid-cols-[0.8fr_1.2fr_1fr] sm:gap-8">
        <div>
          <dt className="text-xs text-muted-foreground">
            Apps in the collection
          </dt>
          <dd className="mt-2 text-2xl font-semibold tracking-tight">
            {appCount}{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              and counting
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Platform support</dt>
          <dd className="mt-2 text-lg font-medium tracking-tight">
            macOS, Windows &amp; Linux
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Always open</dt>
          <dd className="mt-2 text-lg font-medium tracking-tight">
            Free &amp; open source
          </dd>
        </div>
      </dl>

      <section
        aria-labelledby="why-hotkys-title"
        className="max-w-3xl py-12 md:py-16"
      >
        <h2
          id="why-hotkys-title"
          className="text-2xl font-semibold tracking-[-0.035em] md:text-3xl"
        >
          From looking it up to knowing it.
        </h2>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            The right shortcut keeps you in the flow. Hotkys brings the
            shortcuts for your everyday apps into one searchable collection, so
            you can spend less time hunting through menus.
          </p>
          <p>
            Find your app, choose your platform, and try something new. Favorite
            the shortcuts you are learning to build a collection that fits the
            way you work.
          </p>
          <p>
            Prefer to stay at your keyboard? The{" "}
            <Link
              href="/raycast-extension"
              className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-brand"
            >
              Raycast extension
            </Link>{" "}
            finds shortcuts for your current app and lets you run them from
            Raycast.
          </p>
        </div>
      </section>
    </div>
  );
}
