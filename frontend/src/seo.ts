type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
  robots?: string;
  ogType?: "website" | "article";
  jsonLd?: JsonLd;
};

export const SITE_URL = "https://styleo.vercel.app";
const DEFAULT_IMAGE_URL = `${SITE_URL}/favicon_StyleO.png`;

const DEFAULT_DESCRIPTION =
  "StyleO helps you digitize your wardrobe, track garment lifecycle, and get AI-powered outfit recommendations based on what you actually own.";

const routeMetadata: Record<string, SeoMetadata> = {
  "/": {
    title: "StyleO | AI Wardrobe Management & Outfit Recommendations",
    description:
      "Digitize your wardrobe, track garment availability, and get AI outfit recommendations tailored to your closet, routine, and context.",
    canonicalPath: "/",
    keywords:
      "AI wardrobe app, digital closet, outfit recommendations, wardrobe management, closet organizer, fashion assistant, StyleO",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "StyleO",
        url: `${SITE_URL}/`,
        description: DEFAULT_DESCRIPTION,
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "StyleO",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        url: `${SITE_URL}/`,
        description:
          "AI-powered wardrobe management platform for digitizing your closet and generating outfit recommendations.",
      },
    ],
  },
  "/about": {
    title: "About StyleO | AI Wardrobe Intelligence Platform",
    description:
      "Learn how StyleO differs from generic fashion chatbots with persistent wardrobe memory, garment lifecycle tracking, and context-aware outfit planning.",
    canonicalPath: "/about",
    keywords:
      "about StyleO, wardrobe intelligence, digital closet platform, AI fashion assistant",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About StyleO",
      url: `${SITE_URL}/about`,
      description:
        "Overview of StyleO's wardrobe intelligence features, lifecycle tracking, and personalized outfit recommendations.",
    },
  },
  "/contact": {
    title: "Contact StyleO | Product Questions, Feedback, and Collaboration",
    description:
      "Contact StyleO for product feedback, feature requests, partnerships, or collaboration opportunities.",
    canonicalPath: "/contact",
    keywords:
      "contact StyleO, StyleO support, StyleO feedback, wardrobe app contact",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact StyleO",
      url: `${SITE_URL}/contact`,
      description:
        "Contact page for StyleO product feedback, questions, and collaboration requests.",
    },
  },
  "/login": {
    title: "Login | StyleO",
    description: "Log in to StyleO to access your wardrobe and outfit recommendations.",
    canonicalPath: "/login",
    robots: "noindex, nofollow",
  },
  "/signup": {
    title: "Sign Up | StyleO",
    description:
      "Create a StyleO account to digitize your wardrobe and receive AI outfit recommendations.",
    canonicalPath: "/signup",
    robots: "noindex, nofollow",
  },
  "/dashboard": {
    title: "Dashboard | StyleO",
    description: "Your StyleO wardrobe dashboard.",
    canonicalPath: "/dashboard",
    robots: "noindex, nofollow",
  },
  "/profile": {
    title: "Profile | StyleO",
    description: "Manage your StyleO profile and preferences.",
    canonicalPath: "/profile",
    robots: "noindex, nofollow",
  },
  "/item/new": {
    title: "Add Item | StyleO",
    description: "Upload new wardrobe items to StyleO.",
    canonicalPath: "/item/new",
    robots: "noindex, nofollow",
  },
  "/closet": {
    title: "Closet | StyleO",
    description: "Browse your digitized wardrobe in StyleO.",
    canonicalPath: "/closet",
    robots: "noindex, nofollow",
  },
  "/outfits": {
    title: "Outfits | StyleO",
    description: "View AI-generated outfit recommendations in StyleO.",
    canonicalPath: "/outfits",
    robots: "noindex, nofollow",
  },
};

function ensureMeta(selector: string, attributes: Record<string, string>) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      meta?.setAttribute(key, value);
    });
    document.head.appendChild(meta);
  }
  return meta;
}

function ensureCanonical() {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  return link;
}

function ensureJsonLdScript() {
  let script = document.getElementById("styleo-jsonld") as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = "styleo-jsonld";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  return script;
}

export function applySeo(pathname: string) {
  const metadata = routeMetadata[pathname] ?? routeMetadata["/"];
  const canonicalUrl = new URL(metadata.canonicalPath, `${SITE_URL}/`).toString();
  const robots = metadata.robots ?? "index, follow";
  const ogType = metadata.ogType ?? "website";

  document.title = metadata.title;

  ensureMeta('meta[name="description"]', { name: "description" }).setAttribute(
    "content",
    metadata.description,
  );
  ensureMeta('meta[name="keywords"]', { name: "keywords" }).setAttribute(
    "content",
    metadata.keywords ?? routeMetadata["/"].keywords ?? "",
  );
  ensureMeta('meta[name="robots"]', { name: "robots" }).setAttribute(
    "content",
    robots,
  );
  ensureMeta('meta[property="og:site_name"]', {
    property: "og:site_name",
  }).setAttribute("content", "StyleO");
  ensureMeta('meta[property="og:type"]', { property: "og:type" }).setAttribute(
    "content",
    ogType,
  );
  ensureMeta('meta[property="og:title"]', {
    property: "og:title",
  }).setAttribute("content", metadata.title);
  ensureMeta('meta[property="og:description"]', {
    property: "og:description",
  }).setAttribute("content", metadata.description);
  ensureMeta('meta[property="og:url"]', { property: "og:url" }).setAttribute(
    "content",
    canonicalUrl,
  );
  ensureMeta('meta[property="og:image"]', {
    property: "og:image",
  }).setAttribute("content", DEFAULT_IMAGE_URL);
  ensureMeta('meta[name="twitter:card"]', {
    name: "twitter:card",
  }).setAttribute("content", "summary");
  ensureMeta('meta[name="twitter:title"]', {
    name: "twitter:title",
  }).setAttribute("content", metadata.title);
  ensureMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
  }).setAttribute("content", metadata.description);
  ensureMeta('meta[name="twitter:image"]', {
    name: "twitter:image",
  }).setAttribute("content", DEFAULT_IMAGE_URL);

  ensureCanonical().setAttribute("href", canonicalUrl);

  const jsonLdScript = ensureJsonLdScript();
  jsonLdScript.textContent = JSON.stringify(metadata.jsonLd ?? routeMetadata["/"].jsonLd);
}
