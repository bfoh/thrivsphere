import { HomeDeck } from "@/components/HomeDeck";
import { services } from "@/data/site";

export default function Home() {
  return <HomeDeck services={services} />;
}
