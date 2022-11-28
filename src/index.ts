import * as _ from "lodash";
import * as d3 from "d3";
import * as initSqlJs from "sql.js";
import * as pako from "pako";

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
  };
  xhr.send();
});
