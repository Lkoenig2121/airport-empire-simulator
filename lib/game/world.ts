import { HOME_AIRPORT_ID } from "../flight/types";
import { hubBuildings, isHomeAirport } from "./hubs";
import type { Aircraft, Building, GameState, Passenger } from "./types";

export function worldBuildings(state: Pick<GameState, "currentAirportId" | "buildings">): Building[] {
  if (isHomeAirport(state.currentAirportId)) return state.buildings;
  return hubBuildings(state.currentAirportId);
}

export function worldAircraft(state: Pick<GameState, "currentAirportId" | "aircraft" | "hubAircraft">): Aircraft[] {
  const here = state.currentAirportId || HOME_AIRPORT_ID;
  const local = state.aircraft.filter((a) => (a.airportId ?? HOME_AIRPORT_ID) === here);
  if (isHomeAirport(here)) return local;
  return [...state.hubAircraft, ...local];
}

export function worldPassengers(state: Pick<GameState, "currentAirportId" | "passengers" | "hubPassengers">): Passenger[] {
  if (isHomeAirport(state.currentAirportId)) return state.passengers;
  return state.hubPassengers;
}
