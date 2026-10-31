import { HomeDeck } from "@/components/HomeDeck";
import { getPublishedServices } from "@/lib/queries/catalogue";

// Service wording is edited in the back office; edits also refresh this page
// straight away, so this is only a backstop.
export const revalidate = 300;

export default async function Home() {
  return <HomeDeck services={await getPublishedServices()} />;
}
