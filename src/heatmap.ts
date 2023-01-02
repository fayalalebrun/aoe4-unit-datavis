import * as _ from "lodash";
import * as d3 from "d3";
import { createSlope } from "./slope";
import { Unit } from "./index";

export function createHeatmapDropdown(data: Unit[]) {
  // Full name of civilization for each abbreviation
  var civTitles: { [key: string]: string } = {
    en: "English",
    ru: "Rus",
    ab: "Abbasid Dynasty",
    hr: "Holy Roman Empire",
    fr: "French",
    ch: "Chinese",
    de: "Delhi Sultanate",
    ma: "Malians",
    mo: "Mongols",
    ot: "Ottomans",
  };

  // Get list of all unique civs in dataset
  var civs = [...new Set(data.map((item) => item.civs).flat())];

  // Create select button element for allied civilizations
  var selectAllied = document.createElement("select");
  selectAllied.name = "alliedCivs";
  selectAllied.id = "alliedCivs";

  // Create select button element for rival civilizations
  var selectRival = document.createElement("select");
  selectRival.name = "rivalCivs";
  selectRival.id = "rivalCivs";

  // Create label for select buttons
  var labelAllied = document.createElement("label");
  labelAllied.innerHTML = "Allied Civilization: ";
  labelAllied.htmlFor = "civs";

  var labelRival = document.createElement("label");
  labelRival.innerHTML = "Rival Civilization: ";
  labelRival.htmlFor = "rivalCivs";

  // Append created label and select button
  document
    .getElementById("alliedCivSelectButton")
    .appendChild(labelAllied)
    .appendChild(selectAllied);
  document
    .getElementById("rivalCivSelectButton")
    .appendChild(labelRival)
    .appendChild(selectRival);

  // Add options for ally selection
  for (const civ of civs) {
    var option = document.createElement("option");
    option.value = civ;
    option.text =
      civTitles[civ].charAt(0).toUpperCase() + civTitles[civ].slice(1);
    selectAllied.appendChild(option);
  }

  // Add options for rival selection
  for (const civ of civs) {
    var option = document.createElement("option");
    option.value = civ;
    option.text =
      civTitles[civ].charAt(0).toUpperCase() + civTitles[civ].slice(1);
    selectRival.appendChild(option);
  }

  // Add onchange listener to buttons to keep track of selection
  document.getElementById("rivalCivSelectButton").onchange = function () {
    d3.selectAll("svg").remove();
    createHeatmap(data, selectAllied.value, selectRival.value);
  };
  document.getElementById("alliedCivSelectButton").onchange = function () {
    d3.selectAll("svg").remove();
    createHeatmap(data, selectAllied.value, selectRival.value);
  };

  // return listed civilizations in select menus
  return civs;
}

function getModifierHeatmapData(
  alliedUnits: Unit[],
  rivalUnits: Unit[]
): [number, any[]] {
  var heatmapData: any[] = [];
  // Keep track of max attack bonus in data for color scaling
  var maxBonus = 0;
  alliedUnits.forEach((alliedUnit) => {
    // Retrieve all modifiers/attack bonuses for an allied unit
    let modifiers: any[] = [];
    alliedUnit.weapons.forEach((weapon) => {
      weapon.modifiers.forEach((modifier) => {
        modifier.target.class.forEach((targetClasses) => {
          targetClasses.forEach((unitClass) => {
            modifiers.push({
              class: unitClass,
              value: modifier.value,
            });
          });
        });
      });
    });
    // Create heatmap objects that show modifiers for each allied and rival unit pair
    let alliedRivalPairs = rivalUnits
      .map((rivalUnit) => {
        var obj = undefined;
        // Check whether rival unit is associated with any modifier for the allied unit
        // Save unit pair and modifier value if true
        // Update maxBonus if modifier value is larger
        modifiers.forEach((m) => {
          if (rivalUnit.classes.includes(m.class)) {
            obj = {
              uX: rivalUnit.baseId,
              uY: alliedUnit.baseId,
              uV: m.value,
            };
            if (m.value > maxBonus) {
              maxBonus = m.value;
            }
          }
        });

        // If rival unit is not associated with any modifier for the allied unit, save the unit pair with a value of 0
        if (obj == undefined) {
          obj = {
            uX: rivalUnit.baseId,
            uY: alliedUnit.baseId,
            uV: 0,
          };
        }
        // Return modifier unit pair
        return obj;
      })
      .flat();
    // Concatenate list of pairs as heatmap data
    heatmapData = heatmapData.concat(alliedRivalPairs);
  });
  // return max value from relevant modifiers and the heatmap data
  return [maxBonus, heatmapData];
}

export async function createHeatmap(
  data: Unit[],
  allyCiv: string,
  rivalCiv: string
) {
  // Set the dimensions and margins of the graph
  var margin = { top: 20, right: 5, bottom: 160, left: 170 },
    width = 900 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

  // Append the svg object to the body of the page
  var svg = d3
    .select("#unitHeatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Labels of row and columns
  // Create array of unique units for chosen rival and allied civilizations
  const rivalUnits = data.filter((item) => item.civs.includes(rivalCiv));
  const uniqueRivalUnits = [
    ...new Map(rivalUnits.map((item) => [item.baseId, item])).values(),
  ];
  const rivalUnitTitles = uniqueRivalUnits.map((item) => item.baseId);
  rivalUnitTitles.sort();

  const alliedUnits = data.filter((item) => item.civs.includes(allyCiv));
  const uniqueAlliedUnits = [
    ...new Map(alliedUnits.map((item) => [item.baseId, item])).values(),
  ];
  const alliedUnitTitles = [...new Set(alliedUnits.map((item) => item.baseId))];
  alliedUnitTitles.sort();

  // Build X scales and axis:
  var x = d3
    .scaleBand()
    .range([0, width])
    .domain(rivalUnitTitles)
    .padding(0.01);

  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)");

  // Build Y scales and axis:
  var y = d3
    .scaleBand()
    .range([height, 0])
    .domain(alliedUnitTitles)
    .padding(0.01);
  svg.append("g").call(d3.axisLeft(y));

  // Get processed data for heatmap
  const modifierHeatmapData = getModifierHeatmapData(
    uniqueAlliedUnits,
    uniqueRivalUnits
  );
  const maxBonus = modifierHeatmapData[0];
  const heatmapData = modifierHeatmapData[1];

  // Build color scale
  var myColor = d3
    .scalePow<string>()
    .exponent(0.4)
    .domain([0, maxBonus])
    .range(["white", "#074b70"]);

  // Create a tooltip
  var tooltip = d3
    .select("#unitHeatmap")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("position", "absolute");

  // Change the tooltip when user hovers a heatmap cell
  var mouseover = (event: any, de: any) => {
    tooltip.style("opacity", 1);
    svg.selectAll("#high2").remove();
    svg
      .selectAll()
      .data(heatmapData, function (d) {
        return d.uX + ":" + d.uY;
      })
      .enter()
      .append("rect")
      .attr("id", "high2")
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("y", y(de.uY))
      .attr("x", x(de.uX))
      .style("stroke", "black")
      .style("fill", "none")
      .style("opacity", 1);
  };

  // Change the tooltip when user moves mouse
  var mousemove = (event: any, d: any) => {
    tooltip
      .html(
        "<strong style = 'color:green'>" +
          d.uY +
          "</strong> has <br> <strong style = 'color:blue'>" +
          d.uV +
          "</strong> bonus attack against <br> <strong style = 'color:red'>" +
          d.uX +
          "</strong>"
      )
      .style("left", event.pageX + 50 + "px")
      .style("top", event.pageY - 30 + "px");
  };

  // Change the tooltip when user leaves a cell
  var mouseleave = (event: any, d: any) => {
    tooltip.style("opacity", 0);
    d3.select(this).style("stroke", "none").style("opacity", 0.8);
  };

  // Highlights the row/column (alllied units) when user clicks on a rival unit cell
  var rivalHighlight = (event: any, de: any) => {
    svg.selectAll("#highlight").remove();
    svg
      .selectAll()
      .data(heatmapData, function (d) {
        return d.uX + ":" + d.uY;
      })
      .enter()
      .append("rect")
      .attr("id", "highlight")
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("y", (d) => y(d.uY))
      .attr("x", x(de.uX))
      .attr("opacity", 1)
      .attr("stroke", "orange")
      .style("fill", "none");
  };

  // Fill in heatmap cells with heatmap data
  svg
    .selectAll()
    .data(heatmapData, function (d) {
      return d.uX + ":" + d.uY;
    })
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x(d.uX);
    })
    .attr("y", function (d) {
      return y(d.uY);
    })
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      return myColor(d.uV);
    })
    .style("stroke", "#c7c7c7")
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)
    .on("click", rivalHighlight);

  // Set default highlight for first rival unit as initial highlight state
  svg
    .selectAll()
    .data(heatmapData, function (d) {
      return d.uX + ":" + d.uY;
    })
    .enter()
    .append("rect")
    .attr("id", "highlight")
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("y", (d) => y(d.uY))
    .attr("x", (d) => x(rivalUnitTitles[0]))
    .attr("stroke", "orange")
    .style("fill", "none");
}
