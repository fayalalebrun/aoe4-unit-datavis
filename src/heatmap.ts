import * as _ from "lodash";
import * as d3 from "d3";
import { Unit } from "./index";

class ModifierData {
  attackerName: string;
  defenderName: string;
  modifierV: number;

  constructor(attackerCiv: string, defenderCiv: string, modifierV: number) {
    this.attackerName = attackerCiv;
    this.defenderName = defenderCiv;
    this.modifierV = modifierV;
  }
}

class HeatmapData {
  attackerCiv: string;
  defenderCiv: string;
  maxBonus: number;
  modifierData: ModifierData[];
  attackerUnitNames: string[];
  defenderUnitNames: string[];

  constructor(
    attackerCiv: string,
    defenderCiv: string,
    maxBonus: number,
    modifierData: any[],
    attackerUnitNames: string[],
    defenderUnitNames: string[]
  ) {
    this.attackerCiv = attackerCiv;
    this.defenderCiv = defenderCiv;
    this.maxBonus = maxBonus;
    this.modifierData = modifierData;
    this.attackerUnitNames = attackerUnitNames;
    this.defenderUnitNames = defenderUnitNames;
  }
}

const civTitles: { [key: string]: string } = {
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

/**
 * Make a dropdown list for a given axis.
 */
function createDropDown(
  data: string[],
  name: string,
  axisName: string,
  units: Unit[],
  allHeatmapData: HeatmapData[]
) {
  var dropdown = d3
    .select("#dropdown_container_" + axisName)
    .append("select")
    .attr("class", "selection")
    .text("adas")
    .attr("id", name)
    .on("change", function () {
      selectCivilization(units, allHeatmapData);
    });

  var options = dropdown
    .selectAll("option")
    .data(data)
    .enter()
    .append("option");
  options.text(function (d) {
    return d;
  });
}

function getUnitsLowestAge(names: string[], units: Unit[]) {
  return names.map((name) => {
    return units
      .filter((unit) => prettifyUnitName(unit.baseId) == name)
      .reduce((acc, unit) => {
        if (acc.age < unit.age) {
          return acc;
        } else {
          return unit;
        }
      });
  });
}

function prettifyUnitName(name: string) {
  if (name != "man-at-arms") {
    const spaced = name.replace(/-/g, " ");
    return spaced.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
      letter.toUpperCase()
    );
  } else {
    return "Man-At-Arms";
  }
}

function getAllHeatmapData(data: Unit[], civTitles: string[]): HeatmapData[] {
  const allHeatmapData = civTitles
    .map((attackerCiv) => {
      let attackerUnits = data.filter((item) =>
        item.civs.includes(attackerCiv)
      );
      let attackerUnitNames = [
        ...new Set(attackerUnits.map((item) => prettifyUnitName(item.baseId))),
      ];

      // Create array of unique units for chosen attacker and defender civilizations based on lowest age
      const uniqueAttackerUnits: Unit[] = getUnitsLowestAge(
        attackerUnitNames,
        attackerUnits
      );

      var defenderHeatmapData = civTitles.map((defenderCiv) => {
        let modifierData: any[] = [];
        // Keep track of max attack bonus in data for color scaling
        let maxBonus = 0;
        let defenderUnits = data.filter((item) =>
          item.civs.includes(defenderCiv)
        );

        let defenderUnitNames = [
          ...new Set(
            defenderUnits.map((item) => prettifyUnitName(item.baseId))
          ),
        ];

        const uniqueDefenderUnits: Unit[] = getUnitsLowestAge(
          defenderUnitNames,
          defenderUnits
        );

        uniqueAttackerUnits.forEach((attackerUnit) => {
          // Retrieve all modifiers/attack bonuses for an attacker unit
          let modifiers: any[] = [];
          attackerUnit.weapons.forEach((weapon) => {
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
          // Create heatmap objects that show modifiers for each attacker and defender unit pair
          let attackerDefenderPairs = uniqueDefenderUnits
            .map((defenderUnit) => {
              let obj: ModifierData = new ModifierData(
                prettifyUnitName(attackerUnit.baseId),
                prettifyUnitName(defenderUnit.baseId),
                0
              );
              // Check whether defender unit is associated with any modifier for the attacker unit
              // Save unit pair and modifier value if true
              // Update maxBonus if modifier value is larger
              modifiers.forEach((m) => {
                if (defenderUnit.classes.includes(m.class)) {
                  obj.modifierV = m.value;
                  if (m.value > maxBonus) {
                    maxBonus = m.value;
                  }
                }
              });

              // Return modifier unit pair
              return obj;
            })
            .flat();
          // Concatenate list of pairs as heatmap data
          modifierData = modifierData.concat(attackerDefenderPairs);
        });
        attackerUnitNames.sort().reverse();
        defenderUnitNames.sort();
        return new HeatmapData(
          attackerCiv,
          defenderCiv,
          maxBonus,
          modifierData,
          attackerUnitNames,
          defenderUnitNames
        );
      });
      // return max value from relevant modifiers and the heatmap data
      return defenderHeatmapData;
    })
    .flat();
  return allHeatmapData;
}

function filterHeatmap(
  heatmapData: HeatmapData,
  checkAttacker: boolean,
  checkDefender: boolean
) {
  let attackerUnitNamesTemp: string[] = [];
  let defenderUnitNamesTemp: string[] = [];
  let unitNamesTemp: string[] = [];
  let modifierDataTemp = heatmapData.modifierData;
  let updatedHeatmapData = structuredClone(heatmapData);
  if (checkAttacker) {
    heatmapData.attackerUnitNames.forEach((name: string) => {
      let unitNameValues = modifierDataTemp
        .filter((modData) => modData.attackerName == name)
        .map((modData) => modData.modifierV);
      if (!unitNameValues.every((v: number) => v == 0)) {
        attackerUnitNamesTemp.push(name);
      } else {
        modifierDataTemp = modifierDataTemp.filter(
          (modData) => modData.attackerName != name
        );
      }
    });
    updatedHeatmapData.attackerUnitNames = attackerUnitNamesTemp;
    updatedHeatmapData.modifierData = modifierDataTemp;
  }
  if (checkDefender) {
    heatmapData.defenderUnitNames.forEach((name: string) => {
      let unitNameValues = modifierDataTemp
        .filter((modData) => modData.defenderName == name)
        .map((modData) => modData.modifierV);
      if (!unitNameValues.every((v: number) => v == 0)) {
        defenderUnitNamesTemp.push(name);
      } else {
        modifierDataTemp = modifierDataTemp.filter(
          (modData) => modData.defenderName != name
        );
      }
    });
    updatedHeatmapData.defenderUnitNames = defenderUnitNamesTemp;
    updatedHeatmapData.modifierData = modifierDataTemp;
  }
  return updatedHeatmapData;
}

// Retrieve the selected axis option from the dropdown menus
function getSelectedValue(name: string) {
  const title = d3.select("#" + name + " option:checked").text();
  return Object.keys(civTitles).find((key) => civTitles[key] === title);
}

function getSelectedHeatmapData(allHeatmapData: HeatmapData[]) {
  const heatmapData = allHeatmapData.find(
    (item) =>
      item.attackerCiv == getSelectedValue("attacker_selection") &&
      item.defenderCiv == getSelectedValue("defender_selection")
  );
  return heatmapData;
}

function selectCivilization(data: Unit[], allHeatmapData: HeatmapData[]) {
  const filteredHeatmap = filterHeatmap(
    getSelectedHeatmapData(allHeatmapData),
    d3.select("#check_attacker").property("checked"),
    d3.select("#check_defender").property("checked")
  );
  updateHeatmap(filteredHeatmap);
}

export async function createHeatmap(data: Unit[]) {
  const allHeatmapData = getAllHeatmapData(data, Object.keys(civTitles));
  createDropDown(
    Object.values(civTitles),
    "defender_selection",
    "defender",
    data,
    allHeatmapData
  );
  createDropDown(
    Object.values(civTitles),
    "attacker_selection",
    "attacker",
    data,
    allHeatmapData
  );

  updateHeatmap(getSelectedHeatmapData(allHeatmapData));
  d3.select("#check_attacker").on("change", function () {
    selectCivilization(data, allHeatmapData);
  });
  d3.select("#check_defender").on("change", function () {
    selectCivilization(data, allHeatmapData);
  });
}

export function updateHeatmap(heatmapData: HeatmapData) {
  d3.select("#unitHeatmap").selectAll("svg").remove();

  if (d3.select("#check_attacker").property("checked")) {
    // Set the dimensions and margins of the graph
    var margin = { top: 170, right: 20, bottom: 20, left: 220 },
      width = 1200 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;
  } else {
    // Set the dimensions and margins of the graph
    var margin = { top: 170, right: 20, bottom: 20, left: 220 },
      width = 1000 - margin.left - margin.right,
      height = 800 - margin.top - margin.bottom;
  }

  // Append the svg object to the body of the page
  var svg = d3
    .select("#unitHeatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Build X scales and axis:
  var x = d3
    .scaleBand()
    .range([0, width])
    .domain(heatmapData.defenderUnitNames)
    .padding(0.01);

  svg
    .append("g")
    .call(d3.axisTop(x))
    .selectAll("text")
    .style("text-anchor", "start")
    .attr("dx", ".8em")
    .attr("dy", "-.15em")
    .attr("transform", "rotate(-65)");

  if (d3.select("#check_attacker").property("checked")) {
    svg
      .append("text")
      .attr("class", "x label")
      .style("text-anchor", "start")
      .attr("x", 380)
      .attr("y", -140)
      .text("Defender - " + civTitles[heatmapData.defenderCiv]);
  } else {
    svg
      .append("text")
      .attr("class", "x label")
      .style("text-anchor", "start")
      .attr("x", 280)
      .attr("y", -140)
      .text("Defender - " + civTitles[heatmapData.defenderCiv]);
  }

  // Build Y scales and axis:
  var y = d3
    .scaleBand()
    .range([height, 0])
    .domain(heatmapData.attackerUnitNames)
    .padding(0.01);
  svg.append("g").call(d3.axisLeft(y));

  if (d3.select("#check_attacker").property("checked")) {
    svg
      .append("text")
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("x", -70)
      .attr("y", -170)
      .attr("dy", ".75em")
      .attr("transform", "rotate(-90)")
      .text("Attacker - " + civTitles[heatmapData.attackerCiv]);
  } else {
    svg
      .append("text")
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("x", -220)
      .attr("y", -170)
      .attr("dy", ".75em")
      .attr("transform", "rotate(-90)")
      .text("Attacker - " + civTitles[heatmapData.attackerCiv]);
  }

  // Build color
  var myColor = d3
    .scalePow<string>()
    .exponent(0.4)
    .domain([0, heatmapData.maxBonus])
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
  var mouseover = (event: any, selectedModifierData: ModifierData) => {
    svg.selectAll("#hover").remove();
    tooltip.style("opacity", 1);
    svg
      .selectAll()
      .data(heatmapData.modifierData)
      .enter()
      .append("rect")
      .attr("id", "hover")
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("y", y(selectedModifierData.attackerName))
      .attr("x", x(selectedModifierData.defenderName))
      .style("stroke", "black")
      .style("fill", "none")
      .style("opacity", 1);
  };

  // Change the tooltip when user moves mouse
  var mousemove = (event: any, d: any) => {
    tooltip
      .html(
        "<strong style = 'color:green'>" +
          d.attackerName +
          "</strong> has <br> <strong style = 'color:blue'>" +
          d.modifierV +
          "</strong> bonus attack against <br> <strong style = 'color:red'>" +
          d.defenderName +
          "</strong>"
      )
      .style("left", event.pageX + 70 + "px")
      .style("top", event.pageY - 50 + "px");
  };

  // Change the tooltip when user leaves a cell
  var mouseleave = (event: any, d: any) => {
    svg.selectAll("#hover").remove();
    tooltip.style("opacity", 0);
  };

  // Highlights the row/column (attacker units) when user clicks on a defender unit cell
  var defenderHighlight = (event: any, selectedModifierData: ModifierData) => {
    svg.selectAll("#highlight").remove();
    svg
      .selectAll()
      .data(heatmapData.modifierData, function (d) {
        return d.defenderName + ":" + d.attackerName;
      })
      .enter()
      .append("rect")
      .attr("id", "highlight")
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("y", (d) => y(d.attackerName))
      .attr("x", x(selectedModifierData.defenderName))
      .attr("opacity", 1)
      .attr("stroke", "orange")
      .attr("stroke-width", 1.5)
      .style("fill", "none");
  };

  // Fill in heatmap cells with heatmap data
  svg
    .selectAll()
    .data(heatmapData.modifierData, function (d) {
      return d.defenderName + ":" + d.attackerName;
    })
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x(d.defenderName);
    })
    .attr("y", function (d) {
      return y(d.attackerName);
    })
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      return myColor(d.modifierV);
    })
    .style("stroke", "#c7c7c7")
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)
    .on("click", defenderHighlight);

  // Set default highlight for first rival unit as initial highlight state
  svg
    .selectAll()
    .data(heatmapData.modifierData, function (d) {
      return d.defenderName + ":" + d.attackerName;
    })
    .enter()
    .append("rect")
    .attr("id", "highlight")
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("y", (d) => y(d.attackerName))
    .attr("x", (d) => x(heatmapData.attackerCiv[0]))
    .attr("stroke", "orange")
    .attr("stroke-width", 1.5)
    .style("fill", "none");
}
