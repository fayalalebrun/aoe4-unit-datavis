import * as _ from "lodash";
import * as d3 from "d3";
import { createSlope } from "./slope";
import { createScatter } from "./scatter";
import { createHeatmap } from "./heatmap";
import { createHeatmapDropdown } from "./heatmap";
import { createFiltering, createTable } from "./table";

import "./index.scss";

export interface Unit {
  id: string;
  baseId: string;
  name: string;
  type: string;
  age: number;
  civs: string[];
  classes: string[];
  displayClasses: string[];
  costs: {
    food: number;
    wood: number;
    stone: number;
    gold: number;
  };
  hitpoints: number;
  weapons: {
    name: string;
    type: string;
    damage: number;
    range: {
      min: number;
      max: number;
    };
    modifiers: {
      property: string;
      target: {
        class: string[][];
      };
      effect: string;
      value: number;
      type: string;
    }[];
    durations: {
      aim: number;
      windup: number;
      attack: number;
      winddown: number;
      reload: number;
      setup: number;
      teardown: number;
      cooldown: number;
    };
  }[];
  armor: {
    type: string;
    value: number;
  }[];
  sight: {
    line: number;
  };
  movement: {
    speed: number;
  };
}

async function main() {
  let data: Unit[] = ((await d3.json("all.json")) as any).data;

  await createScatter(data);
  createSlope(data, data[21]);

  const tableFn = (units: Unit[]) =>
    createTable(units, (unit) => createSlope(data, unit));
  tableFn(data);

  createFiltering(data, tableFn);
  const civs = createHeatmapDropdown(data);
  createHeatmap(data, civs[0], civs[0]);
}

main();
