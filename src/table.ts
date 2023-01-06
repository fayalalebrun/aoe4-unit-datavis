import * as d3 from "d3";
import { sort } from "d3";
import Fuse from "fuse.js";
import { Unit } from ".";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";
import { civTitles } from "./heatmap";

/// Creates the controls for filtering the units in the table and other graphs
export function createFiltering(
  units: Unit[],
  onUnitsNarrow: (units: Unit[]) => void
) {
  // Categorical filters
  let filters = {
    name: "",
    age: NaN,
    civ: "",
  };

  // Creates a range for a continuous quantity. Will automatically calculate minimum and maximum
  // for that quantity
  function createRange(
    name: string,
    property: (u: Unit) => number
  ): {
    name: string;
    property: (u: Unit) => number;
    range: [number, number];
    curr: [number, number];
  } {
    const values = units.map(property);
    const min = values.reduce(
      (acc, item) => (item < acc ? item : acc),
      Number.MAX_VALUE
    );
    const max = values.reduce(
      (acc, item) => (item > acc ? item : acc),
      Number.MIN_VALUE
    );

    return { name, property, range: [min, max], curr: [min, max] };
  }

  // Each continuous filter is specified in this array, with a title and a function for obtaining
  // the quantity from the unit.
  let ranges = [
    createRange("Hitpoints", (u) => u.hitpoints),
    createRange("Line of Sight", (u) => u.sight.line),
    createRange("Speed", (u) => u.movement.speed),
    createRange("Attack", (u) => u.weapons[0]?.damage ?? 0),
    createRange(
      "Melee Armor",
      (u) => u.armor.find((a) => a.type == "melee")?.value ?? 0
    ),
    createRange(
      "Ranged Armor",
      (u: Unit) => u.armor.find((a) => a.type == "ranged")?.value ?? 0
    ),
    createRange("Food", (u) => u.costs.food),
    createRange("Gold", (u) => u.costs.gold),
    createRange("Wood", (u) => u.costs.wood),
  ];

  // This is used for fuzzy search
  let fuse = new Fuse(units, { keys: ["name"] });

  // Run the selected filters on the original list of units and return a new list.
  // Captures the list of units from above.
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
        (u) => r.property(u) >= r.curr[0] && r.property(u) <= r.curr[1]
      );
    }, afterCiv);
    return afterRanges;
  }

  // Search filter
  d3.select("#search-input").on("input", (event) => {
    filters.name = event.target.value;
    onUnitsNarrow(doFiltering());
  });

  // Age filter
  d3.select("#select-age")
    .on("change", (event) => {
      filters.age = event.target.value;
      onUnitsNarrow(doFiltering());
    })
    .selectAll("option")
    .data([NaN, ...sort(new Set(d3.map(units, (d) => d.age)).values())])
    .join("option")
    .text((d) => d);

  // Civilization filter
  d3.select("#select-civ")
    .on("change", (event) => {
      filters.civ = searchByValue(civTitles, event.target.value);
      onUnitsNarrow(doFiltering());
    })
    .selectAll("option")
    .data(["", ...sort(new Set(d3.map(units, (d) => d.civs).flat())).values()])
    .join("option")
    .text((d) => civTitles[d]);

  // Add the inputs to each previously created span.
  ranges.forEach((r) => {
    let ranges = document.getElementById("ranges");

    let div = document.createElement("div");
    ranges.appendChild(div);
    div.className = "field is-grouped";

    let label = document.createElement("label");
    label.className = "label";
    label.textContent = r.name;
    div.appendChild(label);

    let minControl = document.createElement("p");
    minControl.className = "control";
    div.appendChild(minControl);

    let minLabel = document.createElement("a");
    minLabel.className = "button is-static is-small mx-2";
    minLabel.textContent = "0.0";
    minControl.appendChild(minLabel);

    let rangeControl = document.createElement("div");
    div.appendChild(rangeControl);
    rangeControl.className = "control is-expanded mx-2";

    let range = document.createElement("div");
    range.id = "#range-" + r.name.toLowerCase().replace(/\s+/g, "-");
    rangeControl.appendChild(range);

    let maxControl = document.createElement("p");
    maxControl.className = "control";
    div.appendChild(maxControl);

    let maxLabel = document.createElement("a");
    maxLabel.className = "button is-static is-small mx-2";
    maxLabel.textContent = "0.0";
    maxControl.appendChild(maxLabel);

    function updateLabels() {
      minLabel.textContent = r.curr[0].toString();
      maxLabel.textContent = r.curr[1].toString();
    }
    updateLabels();

    noUiSlider.create(range, {
      range: { min: r.range[0], max: r.range[1] },
      start: r.range,
    });

    (range as any).noUiSlider.on("update", (values: [number, number]) => {
      r.curr = values;
      updateLabels();
      onUnitsNarrow(doFiltering());
    });
  });
}

// Find key in object by value
const searchByValue = (
  obj: { [x: string]: string | string[] },
  val: string
) => {
  for (let key in obj) {
    if (obj[key].indexOf(val) !== -1) {
      return key;
    }
  }
  return null;
};

// Wraps the element or elements passed and wraps each one in a <p> tag
const pWrap = (field: any) => {
  let div = document.createElement("div");

  let arr = [].concat(field);

  arr.forEach((el) => {
    let p = document.createElement("p");
    p.textContent = el;
    div.appendChild(p);
  });

  return div;
};

// Creates visualization for classes with outline colored according to the class
// Can show multiple classes
const classes = (classes: string[]) => {
  let div = document.createElement("div");
  classes.forEach((c) => {
    let button = document.createElement("button");
    button.className = "button is-static is-outlined is-dark";
    button.style.borderColor = classScaleGlobal(c);
    button.style.borderWidth = "0.2rem";

    button.textContent = c;
    div.appendChild(button);
  });

  return div;
};

type ColumnData = [string, (u: Unit) => any, (u: any) => HTMLDivElement];

// Describe columns in the code itself
const columns: ColumnData[] = [
  ["Name", (u: Unit) => u.name, pWrap],
  ["Civilization", (u: Unit) => u.civs[0], (u: any) => pWrap(civTitles[u])],
  ["Class", (u: Unit) => u.displayClasses, classes],
  ["Hitpoints", (u: Unit) => u.hitpoints, pWrap],
  ["Line of Sight", (u: Unit) => u.sight.line, pWrap],
  ["Speed", (u: Unit) => u.movement.speed, pWrap],
  ["Weapon Type", (u: Unit) => u.weapons.map((w) => w.type), pWrap],
  ["Attack", (u: Unit) => u.weapons.map((w) => w.damage), pWrap],
  [
    "Melee Armor",
    (u: Unit) => u.armor.find((a) => a.type == "melee")?.value ?? 0,
    pWrap,
  ],
  [
    "Ranged Armor",
    (u: Unit) => u.armor.find((a) => a.type == "ranged")?.value ?? 0,
    pWrap,
  ],
  ["Food", (u: Unit) => u.costs.food, pWrap],
  ["Gold", (u: Unit) => u.costs.gold, pWrap],
  ["Wood", (u: Unit) => u.costs.wood, pWrap],
];

export function createTableHeaders(
  units: Unit[],
  tableFn: (units: Unit[]) => void
) {
  interface Header {
    selected: "asc" | "desc" | null;
    data: ColumnData;
  }
  function createHeader(data: ColumnData): Header {
    return { selected: null, data };
  }

  let headers = columns.map(createHeader);
  const nullifyOthers = (header: Header) => {
    headers.map((h) => {
      if (h !== header) {
        h.selected = null;
      }
    });
    if (header.selected === null) {
      header.selected = "asc";
    }
  };

  function drawHeaders() {
    // Create headers.
    d3.select("#headers")
      .selectAll("th")
      .data(headers)
      .join("th")
      .on("click", (_, d) => {
        console.log(d.selected);
        nullifyOthers(d);
        tableFn(
          units.sort((a, b) => {
            const f = d.selected === "asc" ? a : b;
            const s = d.selected === "asc" ? b : a;

            return d.data[1](f)
              .toString()
              .localeCompare(d.data[1](s).toString(), undefined, {
                numeric: true,
              });
          })
        );
        d.selected = d.selected === "asc" ? "desc" : "asc";
        drawHeaders();
      })
      .html((d) => {
        let div = document.createElement("div");
        div.classList.add("has-background-primary");
        div.textContent = d.data[0];
        if (d.selected === "asc") {
          div.textContent += " ▲";
        } else if (d.selected === "desc") {
          div.textContent += " ▼";
        }
        return div.outerHTML;
      });
  }
  drawHeaders();
}

// TODO: Remove this global
let classScaleGlobal: d3.ScaleOrdinal<string, string, never> | null;

/// Creates/updates a table based on a given list of units. Takes a callback which
/// is called on a click event to a row
export async function createTable(
  units: Unit[],
  onUnitSelect: (unit: Unit) => void,
  classScale: d3.ScaleOrdinal<string, string, never>
) {
  classScaleGlobal = classScale;
  // Add a row for each unit.
  const rows = d3
    .select("#table-body")
    .selectAll("tr")
    .data(units)
    .join("tr")
    .on("click", (_, d) => onUnitSelect(d));

  // Add all attributes to each row.
  rows
    .selectAll("td")
    .data((unit: Unit) => columns.map((c) => c[2](c[1](unit))))
    .join("td")
    .html((d) => d.innerHTML);
}
