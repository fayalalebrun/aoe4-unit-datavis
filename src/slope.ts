import * as d3 from "d3";
import { Unit } from ".";

/// Creates/updates the slope graph given the complete list of unit and the selected unit
/// The slope graphs show the change in an attribute per age for a specific unit
export function createSlope(data: Unit[], unit: Unit) {
  const groups = d3.group(
    data,
    (d) => d.civs[0],
    (d) => d.baseId
  );

  const group = groups.get(unit.civs[0]).get(unit.baseId);

  // Other attributes do not seem to change as much from age to age
  const subgraphs = [
    {
      yFn: (d: Unit) => d.hitpoints,
      color: "red",
      title: "Hitpoints",
    },
    {
      yFn: (d: Unit) => {
        return d.weapons[0]?.damage ?? 0;
      },
      color: "cyan",
      title: "Attack",
    },
    {
      yFn: (u: Unit) => u.armor.find((a) => a.type == "melee")?.value ?? 0,
      color: "blue",
      title: "Melee Armor",
    },
    {
      yFn: (u: Unit) => u.armor.find((a) => a.type == "ranged")?.value ?? 0,
      color: "purple",
      title: "Ranged Armor",
    },
  ];
  createSlopeSub(unit, group, subgraphs);
}
/// Creates several slope graphs given a selected unit, a group of units, and a list of
/// parameters for the slope graphs
function createSlopeSub(
  unit: Unit,
  group: Unit[],
  subgraphs: { yFn: (unit: Unit) => number; color: string; title: string }[]
) {
  /// Pretty print age numbers as roman numerals
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

  // Spacing for the graph
  // There are several subgraphs, so spacing must be taken into account
  const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 300 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom,
    heightPerGraph =
      (height - margin.top * subgraphs.length) / subgraphs.length;
  // Remove the graph in case this is an update
  d3.select("#slope").selectAll("svg").remove();
  const svg = d3
    .select("#slope")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Our x axis is the age
  const xDomain = d3.map([1, 2, 3, 4], age_num_to_string);
  const xRange = [0, width];
  const xScale = d3.scalePoint().domain(xDomain).range(xRange);

  // Draw x axis at the bottom
  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  // Dynamically create each subgraph
  subgraphs.map((u, index) => {
    // The y axis is different for each subgraph and determined by the yFn
    const yDomain = d3.extent(group, u.yFn);
    // Calculate the correct location for each subgraph
    const base = (heightPerGraph + margin.top) * index;
    const yRange = [heightPerGraph + base, base];
    const yScale = d3.scaleLinear().domain(yDomain).range(yRange);

    // Limit the amount of ticks to reduce visual cluttter
    svg.append("g").call(d3.axisLeft(yScale).ticks(3));

    // Padding for label
    const padding = 2;

    // Plot line
    svg
      .append("path")
      .datum(group)
      .attr("fill", "none")
      .attr("stroke", u.color)
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x((d: any) => xScale(age_num_to_string(d.age)))
          .y((d: any) => yScale(u.yFn(d))) as any
      );

    // Add circle for currently selected unit
    svg
      .append("circle")
      .attr("cx", xScale(age_num_to_string(unit.age)))
      .attr("cy", yScale(u.yFn(unit)))
      .attr("r", 3)
      .attr("fill", u.color);

    // Add label
    svg
      .append("text")
      .attr("transform", `translate(0, ${base})`)
      .attr("x", padding)
      .attr("y", padding)
      .attr("dy", ".71em")
      .text(u.title);
  });

  return svg.node();
}
