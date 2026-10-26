"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AIRLINE_BY_ID, STAFF_ROLES } from "@/lib/game/catalog";
import { formatClock, formatFullCash } from "@/lib/game/iso";
import { staffingNeeds } from "@/lib/game/simulation";
import { useGame } from "@/lib/game/store";
import type { StaffRole } from "@/lib/game/types";

function Drawer({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="absolute top-24 right-3 bottom-20 z-20 w-[26rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1412]/92 shadow-2xl backdrop-blur-md">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
          {kicker}
        </div>
        <div className="text-lg font-semibold text-white">{title}</div>
      </div>
      <div className="h-[calc(100%-4rem)] overflow-y-auto p-4">{children}</div>
    </aside>
  );
}

export function FlightsPanel() {
  const panel = useGame((s) => s.panel);
  const flights = useGame((s) => s.flights);
  const unlocked = useGame((s) => s.unlockedAirlines);
  if (panel !== "flights") return null;

  return (
    <Drawer title="Flight operations" kicker="Air traffic">
      <div className="mb-4 text-sm text-white/60">
        {unlocked.length
          ? `${unlocked.length} airline contract${unlocked.length > 1 ? "s" : ""} active.`
          : "Build a runway and terminal to attract your first airline."}
      </div>
      <div className="space-y-2">
        {flights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/12 px-3 py-8 text-center text-sm text-white/45">
            No flights scheduled yet.
          </div>
        ) : (
          flights.map((f) => {
            const airline = AIRLINE_BY_ID[f.airlineId];
            const time = formatClock(f.scheduledMin).clock;
            return (
              <div
                key={f.id}
                className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm text-amber-200">{f.flightNo}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    {f.status}
                  </div>
                </div>
                <div className="mt-1 text-sm text-white">
                  {f.origin} → {f.destination}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-white/45">
                  <span>{airline?.name}</span>
                  <span>
                    {time} · {f.passengers} pax · {f.kind}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Drawer>
  );
}

export function StaffPanel() {
  const panel = useGame((s) => s.panel);
  const staff = useGame((s) => s.staff);
  const buildings = useGame((s) => s.buildings);
  const hire = useGame((s) => s.hire);
  const fire = useGame((s) => s.fire);
  if (panel !== "staff") return null;
  const needs = staffingNeeds(buildings);
  const roles = Object.keys(STAFF_ROLES) as StaffRole[];

  return (
    <Drawer title="Workforce" kicker="Staffing">
      <div className="mb-4 grid grid-cols-2 gap-2">
        {roles.map((role) => {
          const have = staff.filter((s) => s.role === role).length;
          const need = needs[role];
          return (
            <button
              key={role}
              type="button"
              onClick={() => hire(role)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/8"
            >
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                {STAFF_ROLES[role].label}
              </div>
              <div className={`text-sm font-semibold ${have < need ? "text-rose-300" : "text-emerald-300"}`}>
                {have}/{need}
              </div>
              <div className="text-[11px] text-white/40">
                Hire · {formatFullCash(STAFF_ROLES[role].wagePerDay)}/day
              </div>
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5">
        {staff.map((person) => (
          <div
            key={person.id}
            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 py-2"
          >
            <div>
              <div className="text-sm text-white">{person.name}</div>
              <div className="text-[11px] text-white/45">{STAFF_ROLES[person.role].label}</div>
            </div>
            <button
              type="button"
              onClick={() => fire(person.id)}
              className="text-[11px] uppercase tracking-wider text-rose-300/80 hover:text-rose-200"
            >
              Release
            </button>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

export function FinancePanel() {
  const panel = useGame((s) => s.panel);
  const ledger = useGame((s) => s.ledger);
  const stats = useGame((s) => s.stats);
  const cash = useGame((s) => s.cash);
  if (panel !== "finance") return null;

  const chart = [
    { name: "Revenue", value: Math.round(stats.revenueToday) },
    { name: "Expenses", value: Math.round(stats.expensesToday) },
    { name: "Net", value: Math.round(stats.revenueToday - stats.expensesToday) },
  ];

  return (
    <Drawer title="Airport finances" kicker="Ledger">
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Cash</div>
          <div className="font-mono text-amber-200">{formatFullCash(cash)}</div>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Today net</div>
          <div className="font-mono text-white">
            {formatFullCash(stats.revenueToday - stats.expensesToday)}
          </div>
        </div>
      </div>
      <div className="mb-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#c4c4c4", fontSize: 11 }} />
            <YAxis tick={{ fill: "#888", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#111a18", border: "1px solid #333" }}
            />
            <Bar dataKey="value" fill="#e3b341" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5">
        {ledger.map((row) => (
          <div key={row.id} className="flex items-center justify-between text-sm">
            <span className="text-white/70">{row.label}</span>
            <span className={row.amount >= 0 ? "font-mono text-emerald-300" : "font-mono text-rose-300"}>
              {row.amount >= 0 ? "+" : ""}
              {formatFullCash(row.amount)}
            </span>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

export function AnalyticsPanel() {
  const panel = useGame((s) => s.panel);
  const stats = useGame((s) => s.stats);
  const buildings = useGame((s) => s.buildings);
  const passengers = useGame((s) => s.passengers);
  if (panel !== "analytics") return null;

  return (
    <Drawer title="Passenger analytics" kicker="Traffic">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Metric label="On the concourse" value={String(passengers.length)} />
        <Metric label="All-time passengers" value={stats.passengersTotal.toLocaleString()} />
        <Metric label="Flights today" value={String(stats.flightsToday)} />
        <Metric label="Structures" value={String(buildings.length)} />
        <Metric label="Satisfaction" value={stats.rating ? `${stats.rating}/100` : "—"} />
        <Metric
          label="Revenue / passenger"
          value={
            stats.passengersToday
              ? formatFullCash(stats.revenueToday / stats.passengersToday)
              : "—"
          }
        />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/50">
        Queues and delays will grow if gates and security lag behind traffic. Add
        landside parking and concessions to lift rating and spend.
      </p>
    </Drawer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 font-mono text-white">{value}</div>
    </div>
  );
}
