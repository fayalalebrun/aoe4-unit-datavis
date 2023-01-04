import * as d3 from "d3";
import { sort, text } from "d3";
import Fuse from "fuse.js";
import { Unit } from ".";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

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
    createRange("Weapon Damage", (u) => u.weapons[0]?.damage ?? 0),
    createRange(
      "Melee armor",
      (u) => u.armor.find((a) => a.type == "melee")?.value ?? 0
    ),
    createRange(
      "Ranged armor",
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
      filters.civ = event.target.value;
      onUnitsNarrow(doFiltering());
    })
    .selectAll("option")
    .data(["", ...sort(new Set(d3.map(units, (d) => d.civs).flat())).values()])
    .join("option")
    .text((d) => d);

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

/// Creates/updates a table based on a given list of units. Takes a callback which
/// is called on a click event to a row
export function createTable(
  units: Unit[],
  onUnitSelect: (unit: Unit) => void,
  classScale: d3.ScaleOrdinal<string, string, never>
) {
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
      button.style.borderColor = classScale(c);
      button.style.borderWidth = "0.2rem";

      button.textContent = c;
      div.appendChild(button);
    });

    return div;
  };

  // Describe columns in the code itself
  const columns: [string, (u: Unit) => any][] = [
    ["Name", (u: Unit) => pWrap(u.name)],
    ["Class", (u: Unit) => classes(u.displayClasses)],
    ["Hitpoints", (u: Unit) => pWrap(u.hitpoints)],
    ["Line of Sight", (u: Unit) => pWrap(u.sight.line)],
    ["Speed", (u: Unit) => pWrap(u.movement.speed)],
    ["Weapon type", (u: Unit) => pWrap(u.weapons.map((w) => w.type))],
    ["Weapon damage", (u: Unit) => pWrap(u.weapons.map((w) => w.damage))],
    [
      "Melee armor",
      (u: Unit) => pWrap(u.armor.find((a) => a.type == "melee")?.value ?? 0),
    ],
    [
      "Ranged armor",
      (u: Unit) => pWrap(u.armor.find((a) => a.type == "ranged")?.value ?? 0),
    ],
    ["Food", (u: Unit) => pWrap(u.costs.food)],
    ["Gold", (u: Unit) => pWrap(u.costs.gold)],
    ["Wood", (u: Unit) => pWrap(u.costs.wood)],
  ];

  // Create headers.
  d3.select("#headers")
    .selectAll("th")
    .data(columns.map((c) => c[0]))
    .join("th")
    .text((d) => d);

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
    .data((unit: Unit) => columns.map((c) => c[1]).map((fn) => fn(unit)))
    .join("td")
    .html((d) => d.innerHTML);
}
