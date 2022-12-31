import * as d3 from "d3";
import { sort } from "d3";
import Fuse from "fuse.js";
import { Unit } from ".";

export function createFiltering(
  units: Unit[],
  onUnitsNarrow: (units: Unit[]) => void
) {
  let filters = {
    name: "",
    age: NaN,
    civ: "",
  };

  function getField(object: any, path: string[]) {
    return path.reduce((acc, item) => acc[item], object);
  }

  function createRange(
    name: string,
    path: string[]
  ): { name: string; path: string[]; range: [number, number] } {
    const values = units.map((u) => getField(u, path));
    const min = values.reduce(
      (acc, item) => (item < acc ? item : acc),
      Number.MAX_VALUE
    );
    const max = values.reduce(
      (acc, item) => (item > acc ? item : acc),
      Number.MIN_VALUE
    );

    return { name, path, range: [min, max] };
  }

  let ranges = [
    createRange("Hitpoints", ["hitpoints"]),
    createRange("Line of Sight", ["sight", "line"]),
  ];

  let fuse = new Fuse(units, { keys: ["name"] });

  function doFiltering(): Unit[] {
    const afterName =
      filters.name === ""
        ? units.slice()
        : fuse.search(filters.name).map((i) => i.item);

    const afterAge = isNaN(filters.age)
      ? afterName
      : afterName.filter((d) => d.age == filters.age);

    const afterCiv =
      filters.civ === ""
        ? afterAge
        : afterAge.filter((d) => {
            return d.civs.some((c) => c === filters.civ);
          });

    const afterRanges = ranges.reduce((acc, r) => {
      return acc.filter(
        (u) =>
          getField(u, r.path) >= r.range[0] && getField(u, r.path) <= r.range[1]
      );
    }, afterCiv);
    return afterRanges;
  }

  d3.select("#search-input").on("input", (event) => {
    filters.name = event.target.value;
    onUnitsNarrow(doFiltering());
  });

  d3.select("#select-age")
    .on("change", (event) => {
      filters.age = event.target.value;
      onUnitsNarrow(doFiltering());
    })
    .selectAll("option")
    .data([NaN, ...sort(new Set(d3.map(units, (d) => d.age)).values())])
    .join("option")
    .text((d) => d);

  d3.select("#select-civ")
    .on("change", (event) => {
      filters.civ = event.target.value;
      onUnitsNarrow(doFiltering());
    })
    .selectAll("option")
    .data(["", ...sort(new Set(d3.map(units, (d) => d.civs).flat())).values()])
    .join("option")
    .text((d) => d);

  d3.select("#ranges")
    .selectAll("span")
    .data(ranges)
    .join("span")
    .attr("id", (d) => "span-" + d.path.join("-"))
    .text((d) => d.name);

  ranges.forEach((r) => {
    d3.select("#span-" + r.path.join("-"))
      .selectAll("input")
      .data(["min", "max"])
      .join("input")
      .attr("type", "number")
      .attr("value", (d) => (d === "min" ? r.range[0] : r.range[1]))
      .on("input", (ev, d) => {
        const num = ev.target.value === "" ? 0 : parseFloat(ev.target.value);
        if (d === "min") {
          r.range[0] = num;
        } else {
          r.range[1] = num;
        }
        onUnitsNarrow(doFiltering());
      });
  });
}

export function createTable(units: Unit[], onUnitSelect: (unit: Unit) => void) {
  const columns: [string, (u: Unit) => any][] = [
    ["Name", (u: Unit) => u.name],
    ["Class", (u: Unit) => u.displayClasses[0]],
    ["Hitpoints", (u: Unit) => u.hitpoints],
    ["Line of Sight", (u: Unit) => u.sight.line],
    ["Speed", (u: Unit) => u.movement.speed],
    ["Weapon type", (u: Unit) => u.weapons[0]?.type],
    ["Weapon damage", (u: Unit) => u.weapons[0]?.damage],
    [
      "Melee armor",
      (u: Unit) => u.armor.find((a) => a.type == "melee")?.value ?? 0,
    ],
    [
      "Ranged armor",
      (u: Unit) => u.armor.find((a) => a.type == "ranged")?.value ?? 0,
    ],
    ["Food", (u: Unit) => u.costs.food],
    ["Gold", (u: Unit) => u.costs.gold],
    ["Stone", (u: Unit) => u.costs.stone],
    ["Wood", (u: Unit) => u.costs.wood],
  ];

  d3.select("#headers")
    .selectAll("th")
    .data(columns.map((c) => c[0]))
    .join("th")
    .text((d) => d);

  const rows = d3
    .select("#table-body")
    .selectAll("tr")
    .data(units)
    .join("tr")
    .on("click", (_, d) => onUnitSelect(d));

  rows
    .selectAll("td")
    .data((unit: Unit) => columns.map((c) => c[1]).map((fn) => fn(unit)))
    .join("td")
    .text((d) => d);
}
