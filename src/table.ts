import * as d3 from "d3";
import { Unit } from ".";

export function createTable(units: Unit[], onUnitSelect: (unit: Unit) => void) {
  const rows = d3
    .select("#table-body")
    .selectAll("tr")
    .data(units)
    .join("tr")
    .on("click", (_, d) => onUnitSelect(d));

  const row_fns = [
    (u: Unit) => u.name,
    (u: Unit) => u.displayClasses[0],
    (u: Unit) => u.hitpoints,
    (u: Unit) => u.costs.food + u.costs.gold + u.costs.stone + u.costs.wood,
    (u: Unit) => u.sight.line,
    (u: Unit) => u.movement.speed,
    (u: Unit) => u.weapons[0]?.type,
    (u: Unit) => u.weapons[0]?.damage,
  ];

  rows
    .selectAll("td")
    .data((unit: Unit) => row_fns.map((fn) => fn(unit)))
    .join("td")
    .text((d) => d);
}
