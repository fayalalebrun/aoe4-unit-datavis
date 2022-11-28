import * as _ from "lodash";
import * as d3 from "d3";

function component() {
  const element = document.createElement("div");

  element.innerHTML = _.join(["Hello", "webpack"], " ");

  return element;
}

document.body.appendChild(component());

d3.select("body").transition().duration(2000).style("background-color", "cyan");
