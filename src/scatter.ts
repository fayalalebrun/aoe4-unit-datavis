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
    "Weapon damage",
    "Weapon max range",
    "Movement speed",
    "Gold costs",
    "Attack bonus max value",
    "Attack duration",
    "Meele armor",
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
    case "Weapon damage":
      return unit.weapons.map((wp) => wp.damage)[0];
    case "Weapon max range":
      return unit.weapons.map((wp) => wp.range.max)[0];
    case "Movement speed":
      return unit.movement.speed;
    case "Gold costs":
      return unit.costs.gold;
    case "Attack bonus max value": {
      if (debug)
        console.log(
          "WEAPONS: " + JSON.stringify(unit.weapons.map((wp) => wp.modifiers))
        );

      return unit.weapons.map((wp) => {
        const modifierValues = wp.modifiers.map((m) =>
          m.value === null ? 0 : m.value
        );
        return modifierValues[0];
      })[0];
    }
    case "Attack duration":
      return unit.weapons.map((wp) => wp.durations.attack)[0];
    case "Meele armor":
      return unit.armor.find((a) => a.type == "melee")?.value ?? 0;
    case "Ranged armor":
      return unit.armor.find((a) => a.type == "ranged")?.value ?? 0;
  }
}

/**
 * Make a dropdown list for a given axis.
 */
function createDropDown(variables: string[], axisName: string, data: Unit[]) {
  var dropdown = d3.select("#dropdown-" + axisName)
    .on("click", function () {
      d3.select(this).classed("is-active", !d3.select(this).classed("is-active"));
      if (d3.select(this).classed("is-active")) {
        d3.select(this).select(".fas").attr("class", "fas fa-angle-up");
      } else {
        d3.select(this).select(".fas").attr("class", "fas fa-angle-down");
      }
    });
  var dropdown_select = dropdown.select("#" + axisName + "_selection");
  for (const [i, v] of variables.entries()) {
    dropdown_select
      .append("a")
      .attr("class", "dropdown-item")
      .text(v)
      .on("click", function () {
        if (d3.select(this).classed("is-active")) return;
        dropdown.selectAll(".dropdown-item").classed("is-active", false);
        d3.select(this).classed("is-active", true);
        dropdown.select(".button p").text(d3.select(this).text())
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
function updateScatterPlot(data: Unit[]) {
  // Enable/disable brush (for zoom)
  var checkbox = document.querySelector("#brush");

  checkbox.addEventListener("change", function() {
    if (this.checked) {
      start_brush_tool();
    } else {
      end_brush_tool();
    }
  });

  // Set the dimensions and margins of the graph
  var margin = { top: 10, right: 30, bottom: 20, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  d3.select("#scatter").selectAll("svg").remove();

  // Retrieve the selected axis option from the dropdown menus
  const xSelectedOptionText = d3.select("#x_selection").select(".is-active").text();
  const ySelectedOptionText = d3.select("#y_selection").select(".is-active").text();

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
  var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .attr("class", "xAxis")
    .call(d3.axisBottom(x));

  var newX = x;

  // Add Y axis
  var y = d3.scaleLinear().domain(yDomain).range([height, 0]);
  var yAxis = svg.append("g")
    .attr("class", "yAxis")
    .call(d3.axisLeft(y));

  var newY = y;

  // Add graph title
  d3.select("#scatterplot_title").text(
    capitalize(ySelectedOptionText) + " vs " + capitalize(xSelectedOptionText)
  );

  // Add graph labels 
  svg.append("text") // Label for the x axis
    .attr("x", 200)
    .attr("y", 415)
    .style("text-anchor", "middle")
    .text(xSelectedOptionText);

  svg.append("text") // Label for the y axis
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(ySelectedOptionText);

  // Add a clipPath: everything out of this area won't be drawn.
  var clip = svg.append("defs").append("svg:clipPath")
    .attr("id", "clip")
    .append("svg:rect")
    .attr("width", width)
    .attr("height", height)
    .attr("x", 0)
    .attr("y", 0);

  // Add brushing
  var brush = d3.brush()                 // Add the brush feature using the d3.brush function
    .extent([[0, 0], [width, height]]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
    .on("end", brushended); // Each time the brush selection changes, trigger the 'updateChart' function

  var gBrush: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

  // Create the scatter variable: where both the circles and the brush take place
  var scatter = svg.append('g')
    .attr("clip-path", "url(#clip)");

  // Add a tooltip div. Here I define the general feature of the tooltip: stuff that do not depend on the data point.
  // Its opacity is set to 0: we don't see it by default.
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

  // A function that change this tooltip when the user hover a point.
  // Its opacity is set to 1: we can now see it. Plus it set the text and position of tooltip depending on the datapoint (d)
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

  // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
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

  // A function that set idleTimeOut to null
  var idleTimeout: any;
  function idled() { idleTimeout = null; }

  function brushended(event: any) {
    var extent = event.selection;

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if (!extent) {
      if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
      newX = x.domain(xDomain);
      newY = y.domain(yDomain);
    } else {
      newX = x.domain([extent[0][0], extent[1][0]].map(newX.invert));
      newY = y.domain([extent[1][1], extent[0][1]].map(newY.invert));
      gBrush.call(brush.clear); // This remove the grey brush area as soon as the selection has been done
    }

    // Update axis and circle position
    updateChart(newX, newY);
  }

  function updateChart(newX: d3.ScaleLinear<number, number, never>, newY: d3.ScaleLinear<number, number, never>) {
    // update axes
    xAxis.transition().duration(1000).call(d3.axisBottom(x));
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    // Updates dots
    scatter
      .selectAll("circle")
      .transition().duration(1000)
      .attr("cx", function (d: any) {
        return x(returnData(d, xSelectedOptionText));
      })
      .attr("cy", function (d: any) {
        return y(returnData(d, ySelectedOptionText));
      })
    
    // update grid
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

  function start_brush_tool() {
    gBrush = svg.append("g")
      .attr("class", "brush")
      .call(brush);
  }
  
  function end_brush_tool() {
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
