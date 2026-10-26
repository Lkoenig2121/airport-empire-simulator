import { STAFF_ROLES } from "./catalog";
import { countType, staffingNeeds } from "./simulation";
import type { BuildId, GameState, PanelId, StaffRole } from "./types";

export type Advice = {
  id: string;
  title: string;
  detail: string;
  why: "expand" | "money" | "rating" | "staff";
  action?: { tool?: BuildId; panel?: PanelId };
};

export type Milestone = {
  id: string;
  label: string;
  done: boolean;
};

export function getAdvice(state: Pick<GameState, "buildings" | "staff" | "cash" | "unlockedAirlines" | "stats">): Advice[] {
  const { buildings, staff, cash, unlockedAirlines, stats } = state;
  const n = (type: BuildId) => countType(buildings, type);
  const needs = staffingNeeds(buildings);
  const have = (role: StaffRole) => staff.filter((s) => s.role === role).length;
  const advice: Advice[] = [];

  const short = (role: StaffRole) => have(role) < needs[role];
  const understaffed = (Object.keys(needs) as StaffRole[]).find(short);

  if (n("cafe") + n("shop") === 0) {
    advice.push({
      id: "concessions",
      title: "Earn from passengers",
      detail:
        "Build a Cafe or Retail Shop beside the terminal. Travelers who walk through spend money and your daily revenue jumps.",
      why: "money",
      action: { tool: "cafe" },
    });
  } else if (n("cafe") + n("shop") < 3 && cash > 40_000) {
    advice.push({
      id: "more-shops",
      title: "Add another concession",
      detail:
        "Each extra cafe or shop is another till. Place them on the walking path between parking, security, and the gates.",
      why: "money",
      action: { tool: n("cafe") === 0 ? "cafe" : "shop" },
    });
  }

  if (n("gate") < 2) {
    advice.push({
      id: "second-gate",
      title: "Open a second gate",
      detail:
        "One stand bottlenecks traffic. A second gate, connected by taxiway, lets two aircraft park and doubles landing fees.",
      why: "expand",
      action: { tool: "gate" },
    });
  } else if (n("gate") < 4 && stats.flightsToday >= 4) {
    advice.push({
      id: "more-gates",
      title: "Add more stands",
      detail:
        "Flights are stacking up. Extra gates mean fewer holds on the runway and more passenger revenue per hour.",
      why: "expand",
      action: { tool: "gate" },
    });
  }

  if (n("hangar") === 0) {
    advice.push({
      id: "hangar",
      title: "Build a hangar",
      detail:
        "A maintenance hangar raises rating. With two gates, a hangar, and a 70 rating, Summit Express will offer a national contract.",
      why: "rating",
      action: { tool: "hangar" },
    });
  }

  if (n("security") === 0) {
    advice.push({
      id: "security",
      title: "Staff a checkpoint",
      detail:
        "A Security building near the terminal lifts passenger rating. Higher rating unlocks better airlines and fuller flights.",
      why: "rating",
      action: { tool: "security" },
    });
  }

  if (understaffed) {
    advice.push({
      id: `staff-${understaffed}`,
      title: `Hire a ${STAFF_ROLES[understaffed].label.toLowerCase()}`,
      detail: `You need ${needs[understaffed]} ${STAFF_ROLES[understaffed].label.toLowerCase()}s and have ${have(understaffed)}. Short crews slow boarding and drag the rating down.`,
      why: "staff",
      action: { panel: "staff" },
    });
  }

  if (n("terminal") < 2 && (n("gate") >= 2 || stats.passengersToday > 80)) {
    advice.push({
      id: "second-terminal",
      title: "Expand the terminal",
      detail:
        "A second passenger hall raises capacity for check-in and connections. That is how a regional field becomes a hub.",
      why: "expand",
      action: { tool: "terminal" },
    });
  }

  if (n("runway") < 2 && n("gate") >= 2 && cash > 350_000) {
    advice.push({
      id: "second-runway",
      title: "Lay a second runway",
      detail:
        "One strip can only land or launch one aircraft at a time. A second runway is the biggest capacity jump you can make.",
      why: "expand",
      action: { tool: "runway" },
    });
  }

  if (n("parking") < 2 && n("cafe") + n("shop") > 0) {
    advice.push({
      id: "parking",
      title: "Grow landside parking",
      detail:
        "More parking brings more departing passengers onto the field. Connect it to the terminal with access roads.",
      why: "money",
      action: { tool: "parking" },
    });
  }

  if (!unlockedAirlines.includes("summit") && n("gate") >= 2 && n("hangar") >= 1 && stats.rating < 70) {
    advice.push({
      id: "rating-70",
      title: "Push rating to 70",
      detail:
        "Summit Express needs a 70 passenger rating. Hire missing staff, add security or a shop, and keep gates from overflowing.",
      why: "rating",
      action: { panel: "staff" },
    });
  }

  if (unlockedAirlines.includes("summit") && n("terminal") >= 2) {
    advice.push({
      id: "empire",
      title: "Aim for a national hub",
      detail:
        "Keep adding gates, a second runway, and more concessions. Higher traffic and rating set you up for long-haul contracts later.",
      why: "expand",
      action: { tool: "gate" },
    });
  }

  const order = { money: 0, expand: 1, rating: 2, staff: 3 };
  return advice
    .sort((a, b) => order[a.why] - order[b.why])
    .slice(0, 3);
}

export function getMilestones(state: Pick<GameState, "buildings" | "unlockedAirlines" | "stats">): Milestone[] {
  const { buildings, unlockedAirlines, stats } = state;
  const n = (type: BuildId) => countType(buildings, type);
  return [
    { id: "airline", label: "Sign Horizon Air", done: unlockedAirlines.includes("horizon") },
    { id: "shop", label: "Open a cafe or shop", done: n("cafe") + n("shop") > 0 },
    { id: "gates", label: "Operate 2+ gates", done: n("gate") >= 2 },
    { id: "hangar", label: "Build a hangar", done: n("hangar") > 0 },
    { id: "summit", label: "Unlock Summit Express (rating 70)", done: unlockedAirlines.includes("summit") },
    { id: "hub", label: "Second terminal", done: n("terminal") >= 2 },
    { id: "runways", label: "Second runway", done: n("runway") >= 2 },
    { id: "traffic", label: "200 passengers in a day", done: stats.passengersToday >= 200 || stats.passengersTotal >= 400 },
  ];
}
