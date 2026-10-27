"use client";

import { Application, Container, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import { BUILD_BY_ID } from "@/lib/game/catalog";
import { iso, screenToGrid } from "@/lib/game/iso";
import {
  drawAircraft,
  drawBuilding,
  drawGhost,
  drawHighlight,
  drawPassenger,
  drawWaterAndGround,
} from "@/lib/game/render";
import { canPlace, footprint } from "@/lib/game/simulation";
import { paintCells, useGame } from "@/lib/game/store";
import { MAP_SIZE } from "@/lib/game/types";
import { cellsOf } from "@/lib/game/iso";

export default function AirportCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let app: Application | null = null;
    const world = new Container();
    const ground = new Graphics();
    const builds = new Graphics();
    const ghost = new Graphics();
    const actors = new Graphics();
    world.addChild(ground, builds, ghost, actors);

    const cam = { x: 0, y: 80, zoom: 1, dragging: false, lastX: 0, lastY: 0 };
    const keys = { left: false, right: false, up: false, down: false };
    const paint = { down: false, x: 0, y: 0, lastKey: "" };
    let lastBuildingSig = "";

    const applyCam = () => {
      world.scale.set(cam.zoom);
      world.x = cam.x;
      world.y = cam.y;
    };

    const centerCam = (w: number, h: number) => {
      const mid = iso(MAP_SIZE / 2, MAP_SIZE / 2);
      cam.zoom = 1;
      cam.x = w / 2 - mid.x;
      cam.y = h / 2 - mid.y + 36;
      applyCam();
    };

    const rebuildStatic = () => {
      const { buildings } = useGame.getState();
      const sig = buildings.map((b) => b.id).join("|");
      if (sig === lastBuildingSig) return;
      lastBuildingSig = sig;
      builds.clear();
      const sorted = [...buildings].sort((a, b) => a.x + a.y - (b.x + b.y));
      for (const b of sorted) drawBuilding(builds, b);
    };

    const renderGhost = (gx: number, gy: number) => {
      const { selectedTool, buildings, rotate, inspect, aircraft } = useGame.getState();
      ghost.clear();
      if (inspect?.kind === "building") {
        const building = buildings.find((b) => b.id === inspect.id);
        if (building) drawHighlight(ghost, cellsOf(building.x, building.y, building.w, building.h), 0xf5d76e, 0.38);
      } else if (inspect?.kind === "ground") {
        drawHighlight(ghost, cellsOf(inspect.x, inspect.y, 1, 1), 0xf5d76e, 0.38);
      } else if (inspect?.kind === "aircraft") {
        const plane = aircraft.find((a) => a.id === inspect.id);
        if (plane) {
          drawHighlight(ghost, cellsOf(Math.round(plane.x), Math.round(plane.y), 1, 1), 0xf5d76e, 0.38);
        }
      }
      if (!selectedTool) return;
      if (selectedTool === "demolish") {
        drawGhost(ghost, cellsOf(gx, gy, 1, 1), true, true);
        return;
      }
      const { w, h } = footprint(selectedTool, rotate);
      const valid = canPlace(buildings, selectedTool, gx, gy, rotate);
      drawGhost(ghost, cellsOf(gx, gy, w, h), valid);
    };

    const renderActors = () => {
      const { aircraft, passengers } = useGame.getState();
      actors.clear();
      const list = [
        ...passengers.map((p) => ({ z: p.x + p.y, draw: () => drawPassenger(actors, p) })),
        ...aircraft.map((a) => ({ z: a.x + a.y + (a.alt ?? 0) * 3, draw: () => drawAircraft(actors, a) })),
      ].sort((a, b) => a.z - b.z);
      for (const item of list) item.draw();
    };

    const cellFromEvent = (globalX: number, globalY: number) => {
      const rect = host.getBoundingClientRect();
      const local = world.toLocal({ x: globalX - rect.left, y: globalY - rect.top });
      return screenToGrid(local.x, local.y);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (useGame.getState().welcome) return;
      if (event.button === 1 || event.button === 2 || event.shiftKey) {
        cam.dragging = true;
        cam.lastX = event.clientX;
        cam.lastY = event.clientY;
        return;
      }
      if (event.button !== 0) return;
      const cell = cellFromEvent(event.clientX, event.clientY);
      const tool = useGame.getState().selectedTool;
      if (!tool) {
        useGame.getState().inspectAt(cell.x, cell.y);
        renderGhost(cell.x, cell.y);
        return;
      }
      if (tool === "demolish") {
        useGame.getState().demolish(cell.x, cell.y);
        lastBuildingSig = "";
        rebuildStatic();
        return;
      }
      if (BUILD_BY_ID[tool].paint) {
        paint.down = true;
        paint.x = cell.x;
        paint.y = cell.y;
        paint.lastKey = `${cell.x},${cell.y}`;
        paintCells(tool, cell.x, cell.y, cell.x, cell.y);
        lastBuildingSig = "";
        rebuildStatic();
        return;
      }
      useGame.getState().place(cell.x, cell.y);
      lastBuildingSig = "";
      rebuildStatic();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (cam.dragging) {
        cam.x += event.clientX - cam.lastX;
        cam.y += event.clientY - cam.lastY;
        cam.lastX = event.clientX;
        cam.lastY = event.clientY;
        applyCam();
        return;
      }
      const cell = cellFromEvent(event.clientX, event.clientY);
      useGame.getState().setHover(cell);
      renderGhost(cell.x, cell.y);
      const tool = useGame.getState().selectedTool;
      if (paint.down && tool && tool !== "demolish" && BUILD_BY_ID[tool].paint) {
        const key = `${cell.x},${cell.y}`;
        if (key !== paint.lastKey) {
          paint.lastKey = key;
          paintCells(tool, cell.x, cell.y, cell.x, cell.y);
          lastBuildingSig = "";
          rebuildStatic();
        }
      }
    };

    const onPointerUp = () => {
      cam.dragging = false;
      paint.down = false;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const old = cam.zoom;
      cam.zoom = Math.min(2.4, Math.max(0.45, cam.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
      const rect = host.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      cam.x = mx - ((mx - cam.x) * cam.zoom) / old;
      cam.y = my - ((my - cam.y) * cam.zoom) / old;
      applyCam();
    };

    const onContext = (event: Event) => event.preventDefault();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") keys.left = true;
      else if (event.key === "ArrowRight") keys.right = true;
      else if (event.key === "ArrowUp") keys.up = true;
      else if (event.key === "ArrowDown") keys.down = true;
      else return;
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") keys.left = false;
      else if (event.key === "ArrowRight") keys.right = false;
      else if (event.key === "ArrowUp") keys.up = false;
      else if (event.key === "ArrowDown") keys.down = false;
    };

    const clearKeys = () => {
      keys.left = false;
      keys.right = false;
      keys.up = false;
      keys.down = false;
    };

    let listening = false;

    const bind = () => {
      if (listening) return;
      listening = true;
      host.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      host.addEventListener("wheel", onWheel, { passive: false });
      host.addEventListener("contextmenu", onContext);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", clearKeys);
    };

    const unbind = () => {
      if (!listening) return;
      listening = false;
      host.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
    };

    const safeDestroy = (instance: Application | null) => {
      if (!instance?.renderer) return;
      try {
        instance.destroy();
      } catch {
        /* Pixi can throw if plugins never finished init */
      }
    };

    const onResize = () => {
      if (!app?.renderer || !host.clientWidth || !host.clientHeight) return;
      app.renderer.resize(host.clientWidth, host.clientHeight);
    };

    void (async () => {
      const instance = new Application();
      await instance.init({
        background: 0xfffaf2,
        antialias: true,
        width: Math.max(host.clientWidth, 1),
        height: Math.max(host.clientHeight, 1),
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (disposed) {
        safeDestroy(instance);
        return;
      }
      app = instance;
      host.appendChild(instance.canvas);
      instance.stage.addChild(world);
      drawWaterAndGround(ground, MAP_SIZE);
      rebuildStatic();
      centerCam(instance.renderer.width, instance.renderer.height);
      applyCam();

      instance.ticker.add((ticker) => {
        const step = 520 * (ticker.deltaMS / 1000);
        let panned = false;
        if (keys.left) {
          cam.x += step;
          panned = true;
        }
        if (keys.right) {
          cam.x -= step;
          panned = true;
        }
        if (keys.up) {
          cam.y += step;
          panned = true;
        }
        if (keys.down) {
          cam.y -= step;
          panned = true;
        }
        if (panned) applyCam();
        useGame.getState().tick(ticker.deltaMS / 1000);
        rebuildStatic();
        renderActors();
        const hover = useGame.getState().hoverCell;
        if (hover) renderGhost(hover.x, hover.y);
      });

      bind();
      window.addEventListener("resize", onResize);
    })();

    return () => {
      disposed = true;
      unbind();
      window.removeEventListener("resize", onResize);
      safeDestroy(app);
      app = null;
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 cursor-crosshair" />;
}
