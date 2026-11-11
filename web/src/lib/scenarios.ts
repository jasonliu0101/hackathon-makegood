/**
 * The cases MakeGood is built around. Scooter scrapes lead; every other small dispute
 * follows the same flow. Shared by the landing page and the intake form.
 * /start accepts ?scenario=<id>&role=responsible|affected
 */
export type Scenario = {
  id: string;
  name: string;
  amountUsd: number;
  remedy: "payment" | "repair" | "replacement";
  story: string;
  location: string;
  img?: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "scooter-scrape",
    name: "Scraped a parked scooter",
    amountUsd: 180,
    remedy: "payment",
    story:
      "Backing out of a spot on Dunhua South Road, my scooter scraped the side panel of a parked white scooter. The owner came back while I was still there. I said I'd pay for the respray.",
    location: "Dunhua South Road, Da'an, Taipei",
    img: "/img/vespa.jpg",
  },
  {
    id: "mirror",
    name: "Knocked off a mirror",
    amountUsd: 45,
    remedy: "replacement",
    story:
      "Squeezing between parked scooters on Yongkang Street, my handlebar caught a scooter's left mirror and snapped it off. I left a note with my number. The owner called.",
    location: "Yongkang Street, Taipei",
    img: "/img/taipei-scooters-above.jpg",
  },
  {
    id: "tipped-over",
    name: "Tipped one over",
    amountUsd: 120,
    remedy: "payment",
    story:
      "Pulling my scooter out of a tight row outside MRT Zhongshan, I knocked the next one over. Its brake lever bent and the fairing cracked. I agreed to cover the repair.",
    location: "Outside MRT Zhongshan Station, Taipei",
    img: "/img/guanqian-road.jpg",
  },
  {
    id: "plant-pot",
    name: "Crushed a plant pot",
    amountUsd: 65,
    remedy: "replacement",
    story:
      "Parking in front of a café, my back wheel rolled into a terracotta planter by the door and broke it. I offered to replace the pot and the plant.",
    location: "Outside 42 Fuxing North Road, Taipei",
    img: "/img/plant-pot.jpg",
  },
  {
    id: "fence",
    name: "Backed into a fence",
    amountUsd: 260,
    remedy: "repair",
    story:
      "Rolling my scooter backwards into our lane's parking spot, the rear rack hit my neighbour's bamboo fence and cracked two panels. I said I'd pay a carpenter to fix them.",
    location: "Lane 18, Xinyi Road Section 4, Taipei",
    img: "/img/fence.jpg",
  },
];

export const scenarioById = (id?: string) => SCENARIOS.find((s) => s.id === id);
