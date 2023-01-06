import * as d3 from "d3";
import { Unit } from ".";
import "./styles.scss";

/**
 * Creates a scatter plot based on different unit specifications selected by the user.
 * Uses a dropdown list per axis to pick attributes for comparison.
 */
export async function createScatter(data: Unit[]) {
  // Clickable options in the dropdown list
  const dropdown_list = [
    "Hitpoints",
    "Line of sight",
    "Speed",
    "Weapon damage",
    "Food",
    "Gold",
    "Wood",
    "Melee armor",
    "Ranged armor",
  ];

  createDropDown(dropdown_list, "x", data);
  createDropDown(dropdown_list.reverse(), "y", data);

  updateScatterPlot(data);
}

/**
 * Returns specific data to plot based on the selected option for a specific axis
 * @param  {Unit}   unit           unit to return data from
 * @param  {string} selection_name option selected in dropdown list
 * @return {number}             numerical value to plot in the scatterplot
 */
function returnData(unit: Unit, selection_name: string, debug = false): number {
  switch (selection_name) {
    case "Hitpoints":
      return unit.hitpoints;
    case "Line of sight":
      return unit.sight.line;
    case "Speed":
      return unit.movement.speed;
    case "Weapon damage":
      return unit.weapons[0]?.damage ?? 0;
    case "Melee armor":
      return unit.armor.find((a) => a.type == "melee")?.value ?? 0;
    case "Ranged armor":
      return unit.armor.find((a) => a.type == "ranged")?.value ?? 0;
    case "Food":
      return unit.costs.food;
    case "Gold":
      return unit.costs.gold;
    case "Wood":
      return unit.costs.wood;
  }
}

/**
 * Make a dropdown list for a given axis.
 */
function createDropDown(variables: string[], axisName: string, data: Unit[]) {
  var dropdown = d3.select("#dropdown-" + axisName);

  dropdown.selectAll("a").remove();
  
  dropdown.on("click", function () {
    let active = d3.select(this).classed("is-active");
    d3.selectAll(".dropdown").classed("is-active", false);
    d3.select(this).classed("is-active", !active);

    d3.selectAll(".dropdown").each(function() {
      if (d3.select(this).classed("is-active")) {
        d3.select(this).select(".fas").attr("class", "fas fa-angle-up");
      } else {
        d3.select(this).select(".fas").attr("class", "fas fa-angle-down");
      }
    });
  });
  var dropdown_select = dropdown.select("#" + axisName + "_selection");
  for (const [i, v] of variables.entries()) {
    dropdown_select
      .append("a")
      .attr("class", "dropdown-item")
      .text(v)
      .on("mousedown", function () {
        if (d3.select(this).classed("is-active")) return;
        dropdown.selectAll(".dropdown-item").classed("is-active", false);
        d3.select(this).classed("is-active", true);
        dropdown.select(".button p").text(d3.select(this).text());
        updateScatterPlot(data);
      });
    if (i === 0) {
      dropdown_select.select("a").classed("is-active", true);
      dropdown.select(".dropdown-text").text(v);
    }
  }
}

/**
 * Update the plot to show the data corresponding to the dropdown selection.
 */
async function updateScatterPlot(data: Unit[]) {
  // Enable/disable brush (for zoom)
  var checkbox = document.querySelector("#brush");

  checkbox.addEventListener("change", function () {
    if (this.checked) {
      startBrushTool();
    } else {
      endBrushTool();
    }
  });

  // Set the dimensions and margins of the graph
  var margin = { top: 10, right: 30, bottom: 20, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  d3.select("#scatter").selectAll("svg").remove();

  // Retrieve the selected axis option from the dropdown menus
  const xSelectedOptionText = d3
    .select("#x_selection")
    .select(".is-active")
    .text();
  const ySelectedOptionText = d3
    .select("#y_selection")
    .select(".is-active")
    .text();

  // Determine domains for axes based on selected options
  const selectedDataX = data.map((unit) =>
    returnData(unit, xSelectedOptionText)
  );
  const xDomain = d3.extent(selectedDataX);

  const selectedDataY = data.map((unit) =>
    returnData(unit, ySelectedOptionText)
  );
  const yDomain = d3.extent(selectedDataY);

  const svg = d3
    .select("#scatter")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom + 30)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Add X axis
  var x = d3.scaleLinear().domain(xDomain).range([0, width]);
  var xAxis = svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .attr("class", "xAxis")
    .call(d3.axisBottom(x));

  var newX = x;

  // Add Y axis
  var y = d3.scaleLinear().domain(yDomain).range([height, 0]);
  var yAxis = svg.append("g").attr("class", "yAxis").call(d3.axisLeft(y));

  var newY = y;

  // Add graph title
  d3.select("#scatterplot_title").text(
    capitalize(xSelectedOptionText) + " vs " + capitalize(ySelectedOptionText)
  );

  // Add graph labels
  svg
    .append("text") // Label for the X axis
    .attr("x", 200)
    .attr("y", 415)
    .style("text-anchor", "middle")
    .text(xSelectedOptionText);

  svg
    .append("text") // Label for the Y axis
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(ySelectedOptionText);

  // Add a clipPath: everything out of this area will not be drawn.
  var clip = svg
    .append("defs")
    .append("svg:clipPath")
    .attr("id", "clip")
    .append("svg:rect")
    .attr("width", width)
    .attr("height", height)
    .attr("x", 0)
    .attr("y", 0);

  // Add brushing
  var brush = d3
    .brush()
    .extent([
      [0, 0],
      [width, height],
    ]) // Initialise the brush area at 0, 0 and finish at width, height to select the whole graph area
    .on("end", doneBrushing); // Each time the brush selection changes, trigger the 'doneBrushing' function

  var gBrush: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

  // Create the scatter variable
  var scatter = svg.append("g").attr("clip-path", "url(#clip)");

  // Add a tooltip div. Define the general feature of the tooltip: attributes that do not depend on the data point.
  // Its opacity is set to 0 (invisible).
  const tooltip = d3
    .select("#scatter")
    .append("div")
    .style("opacity", 0)
    .attr("class", "scatter_tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "10px");

  // Change the tooltip when the user hover a point.
  // Its opacity is set to 1 (visible).
  // Set the text and position of the tooltip depending on the datapoint (d).
  const mouseover = function (event: any, d: Unit) {
    tooltip.style("opacity", 1);
  };

  const mousemove = function (event: MouseEvent, d: Unit) {
    tooltip
      .html(
        xSelectedOptionText +
          " : " +
          returnData(d, xSelectedOptionText) +
          "<br>" +
          ySelectedOptionText +
          " : " +
          returnData(d, ySelectedOptionText)
      )
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY + 10 + "px");
  };

  // Change the tooltip when the mouse leaves a point - set opacity to 0
  const mouseleave = function (event: any, d: Unit) {
    tooltip.transition().duration(200).style("opacity", 0);
  };

  // Add units (dots) to the scatterplot
  scatter
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return x(returnData(d, xSelectedOptionText));
    })
    .attr("cy", function (d) {
      return y(returnData(d, ySelectedOptionText));
    })
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  // Draw a grid
  d3.selectAll("g.yAxis g.tick")
    .append("line")
    .attr("class", "gridline")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", width)
    .attr("y2", 0);

  d3.selectAll("g.xAxis g.tick")
    .append("line")
    .attr("class", "gridline")
    .attr("x1", 0)
    .attr("y1", -height)
    .attr("x2", 0)
    .attr("y2", 0);

  // Set idleTimeOut to null
  var idleTimeout: any;
  function idled() {
    idleTimeout = null;
  }

  function doneBrushing(event: any) {
    var extent = event.selection;

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if (!extent) {
      if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350)); // Allows for idle time
      newX = x.domain(xDomain);
      newY = y.domain(yDomain);
    } else {
      newX = x.domain([extent[0][0], extent[1][0]].map(newX.invert));
      newY = y.domain([extent[1][1], extent[0][1]].map(newY.invert));
      gBrush.call(brush.clear); // Removes the grey brush area as soon as the selection is done
    }

    // Update axis and circle position
    updateChart(newX, newY);
  }

  function updateChart(
    newX: d3.ScaleLinear<number, number, never>,
    newY: d3.ScaleLinear<number, number, never>
  ) {
    // Update axes
    xAxis.transition().duration(1000).call(d3.axisBottom(x));
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    // Updates dots
    scatter
      .selectAll("circle")
      .transition()
      .duration(1000)
      .attr("cx", function (d: any) {
        return x(returnData(d, xSelectedOptionText));
      })
      .attr("cy", function (d: any) {
        return y(returnData(d, ySelectedOptionText));
      });

    // Update grid
    d3.selectAll("g.yAxis g.tick")
      .append("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", width)
      .attr("y2", 0);

    d3.selectAll("g.xAxis g.tick")
      .append("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("y1", -height)
      .attr("x2", 0)
      .attr("y2", 0);
  }

  function startBrushTool() {
    gBrush = svg.append("g").attr("class", "brush").call(brush);
  }

  function endBrushTool() {
    svg.selectAll("g.brush").remove();
  }

  function reset() {
    newX = x.domain(xDomain);
    newY = y.domain(yDomain);

    updateChart(newX, newY);
  }

  d3.select("#reset_button").on("click", reset);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
