import * as _ from "lodash";
import * as d3 from "d3";
import * as initSqlJs from "sql.js";
import * as pako from "pako";
import { Database } from "sql.js";

d3.select("body").transition().duration(2000).style("background-color", "cyan");

const SQL = initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`,
}).then((SQL) => {
  const db = new SQL.Database();

  const xhr = new XMLHttpRequest();
  xhr.open("GET", "fires.sqlite.gz", true);
  xhr.responseType = "arraybuffer";

  xhr.onload = (e) => {
    console.log("Got db, inflating");
    const res = pako.inflate(xhr.response);
    console.log("Inflated");
    const uInt8Array = new Uint8Array(res);
    const db = new SQL.Database(uInt8Array);
    const contents = db.exec("SELECT * FROM Fires LIMIT 1");
    const element = document.createElement("div");
    console.log(contents[0]);
    element.innerHTML = _.join(contents[0].values.toString(), " ");
    document.body.appendChild(element);

    createBubble(db);
  };
  xhr.send();
});

function createBubble(db: Database) {
  const margin = { top: 10, right: 20, bottom: 30, left: 50 },
    width = 500 - margin.left - margin.right,
    height = 420 - margin.top - margin.bottom;
  let svg = d3
    .select("#bubblegraph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const contents = db.exec(
    "SELECT FIRE_SIZE_CLASS, ROUND(CAST(DISCOVERY_YEAR AS REAL) + CAST(DISCOVERY_MONTH AS REAL)/12, 2) AS YEAR_MONTH, NWCG_GENERAL_CAUSE, SUM(COUNT) AS COUNT " +
      "FROM Fires " +
      "GROUP BY FIRE_SIZE_CLASS, YEAR_MONTH, NWCG_GENERAL_CAUSE"
  );
  const columns = contents[0].columns;
  const rows = contents[0].values;

  const data = rows.map((row) => {
    let obj = {};
    type ObjType = {
      COUNT: number;
      YEAR_MONTH: number;
      NWCG_GENERAL_CAUSE: string;
      FIRE_SIZE_CLASS: string;
    };
    columns.forEach((column, index) => {
      (obj as any)[column] = row[index];
    });
    return obj as ObjType;
  });

  const fire_size_classes = db
    .exec("SELECT DISTINCT FIRE_SIZE_CLASS FROM Fires")[0]
    .values.flat()
    .sort();

  const causes = db
    .exec("SELECT DISTINCT NWCG_GENERAL_CAUSE FROM Fires")[0]
    .values.flat();

  let x = d3.scaleLinear().domain([1991.5, 2023]).range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  let y = d3
    .scaleBand()
    .domain(fire_size_classes as string[])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));

  let z = d3.scaleLinear().domain([1, 10000]).range([1, 20]);

  var myColor = d3
    .scaleOrdinal()
    .domain(causes as string[])
    .range(d3.schemeSet2);

  svg
    .append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return x(d.YEAR_MONTH);
    })
    .attr("cy", function (d) {
      return y(d.FIRE_SIZE_CLASS);
    })
    .attr("r", function (d) {
      return z(d.COUNT);
    })
    .style("fill", function (d: any) {
      return myColor(d.NWCG_GENERAL_CAUSE);
    } as any)
    .style("opacity", "0.7")
    .attr("stroke", "white")
    .style("stroke-width", "2px");
}
