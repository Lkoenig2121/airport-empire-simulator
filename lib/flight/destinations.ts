import { HOME_AIRPORT_ID, type Destination } from "./types";

export const DESTINATIONS: Destination[] = [
  {
    id: HOME_AIRPORT_ID,
    name: "Skyport International",
    region: "home",
    x: 0,
    y: 0,
    hasRunway: true,
    editable: true,
    code: "SKP",
    tagline: "Your starter field — the only airport you can build.",
  },
  {
    id: "cedar-falls",
    name: "Cedar Falls Metro",
    region: "regional",
    x: 70,
    y: -35,
    hasRunway: true,
    editable: false,
    code: "CFM",
    tagline: "Busy regional hub with a full concourse. Read-only.",
  },
  {
    id: "chicago",
    name: "Chicago Lakeshore",
    region: "national",
    x: 45,
    y: 175,
    hasRunway: true,
    editable: false,
    code: "CLS",
    tagline: "Dual-runway national hub. Read-only.",
  },
  {
    id: "denver",
    name: "Denver Highpeak",
    region: "national",
    x: -165,
    y: 55,
    hasRunway: true,
    editable: false,
    code: "DHP",
    tagline: "High-altitude parallel runways. Read-only.",
  },
  {
    id: "london",
    name: "London Crown",
    region: "international",
    x: 210,
    y: -190,
    hasRunway: true,
    editable: false,
    code: "LCR",
    tagline: "International megahub. Read-only.",
  },
];

export const DESTINATION_BY_ID = Object.fromEntries(
  DESTINATIONS.map((d) => [d.id, d]),
) as Record<string, Destination>;

export const NETWORK_AIRPORTS = DESTINATIONS.filter((d) => d.id !== HOME_AIRPORT_ID);

export function destinationByName(name: string) {
  return DESTINATIONS.find((d) => d.name === name) ?? null;
}

export function nextAirportId(currentId: string, dir: 1 | -1) {
  const ids = DESTINATIONS.map((d) => d.id);
  const i = Math.max(0, ids.indexOf(currentId));
  return ids[(i + dir + ids.length) % ids.length];
}

export function navDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function navHeading(from: { x: number; y: number }, to: { x: number; y: number }) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function displayNm(navUnits: number) {
  return Math.max(1, Math.round(navUnits * 2.4));
}
