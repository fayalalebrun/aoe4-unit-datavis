import * as d3 from "d3";
import { Unit } from ".";

export async function createSlope(data: Unit[], unit: Unit) {
  const groups = d3.group(
    data,
    (d) => d.civs[0],
    (d) => d.baseId
  );

  const group = groups.get(unit.civs[0]).get(unit.baseId);

  console.log(group);
  const subgraphs = [
    {
      yFn: (d: Unit) => d.hitpoints,
      color: "red",
      title: "Hitpoints",
    },
    {
      yFn: (d: Unit) => {
        return d.weapons[0].damage;
      },
      color: "cyan",
      title: "Weapon damage",
    },
    {
      yFn: (d: Unit) => d.armor[0].value,
      color: "blue",
      title: "Armor",
    },
  ];
  await createSlopeSub(group, subgraphs);
}

async function createSlopeSub(
  group: Unit[],
  subgraphs: { yFn: (unit: Unit) => number; color: string; title: string }[]
) {
  function age_num_to_string(num: number): string {
    switch (num) {
      case 1:
        return "I";
      case 2:
        return "II";
      case 3:
        return "III";
      case 4:
        return "IV";
    }
    return "UNDEF";
  }

  const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 300 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom,
    heightPerGraph =
      (height - margin.top * subgraphs.length) / subgraphs.length;
  d3.select("#slope").selectAll("svg").remove();
  const svg = d3
    .select("#slope")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xDomain = d3.map([1, 2, 3, 4], age_num_to_string);
  const xRange = [0, width];
  const xScale = d3.scalePoint().domain(xDomain).range(xRange);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  subgraphs.map((unit, index) => {
    const yDomain = d3.extent(group, unit.yFn);
    const base = (heightPerGraph + margin.top) * index;
    const yRange = [heightPerGraph + base, base];
    const yScale = d3.scaleLinear().domain(yDomain).range(yRange);

    svg.append("g").call(d3.axisLeft(yScale).ticks(3));

    const padding = 2;

    svg
      .append("path")
      .datum(group)
      .attr("fill", "none")
      .attr("stroke", unit.color)
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x((d: any) => xScale(age_num_to_string(d.age)))
          .y((d: any) => yScale(unit.yFn(d))) as any
      );
    svg
      .append("text")
      .attr("transform", `translate(0, ${base})`)
      .attr("x", padding)
      .attr("y", padding)
      .attr("dy", ".71em")
      .text(unit.title);
  });

  return svg.node();
}
