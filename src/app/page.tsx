import type { Metadata } from "next";
import { HomeDeck } from "@/components/HomeDeck";
import { getPublishedServices } from "@/lib/queries/catalogue";
import { brand, legal, team } from "@/data/site";

// Service wording is edited in the back office; edits also refresh this page
// straight away, so this is only a backstop.
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";

/**
 * Structured data for search engines: who runs the site, and the name to show
 * for it. Google reads the business name, logo and contact details from the
 * homepage, so it lives here rather than on every page.
 */
function structuredData() {
  // "9 Shapland, Tadpole Garden Village, Swindon, Wiltshire, SN25 2SD"
  const [street, area, town, county, postcode] = legal.registeredOffice.split(", ");
  const founder = team.find((m) => m.role.startsWith("Founder"));
  const organisation = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organisation`,
    name: brand.name,
    legalName: legal.companyName,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo/thrivesphere-logo.png`,
    email: brand.email,
    telephone: brand.phoneIntl.replace(/\s/g, ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${street}, ${area}`,
      addressLocality: town,
      addressRegion: county,
      postalCode: postcode,
      addressCountry: "GB",
    },
    ...(founder ? { founder: { "@type": "Person", name: founder.name } } : {}),
  };
  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: brand.name,
    url: SITE_URL,
    publisher: { "@id": organisation["@id"] },
  };
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [organisation, website] }).replace(/</g, "\\u003c");
}

export default async function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData() }} />
      <HomeDeck services={await getPublishedServices()} />
    </>
  );
}
