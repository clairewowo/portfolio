import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
console.log('projects found');
renderProjects(projects, projectsContainer, 'h2');
document.querySelector("h1").innerText = `${projects.length} Projects`;

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let data = [1, 2, 3, 4, 5];
let total = 0;

let sliceGenerator = d3.pie();
let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));
let colors = d3.scaleOrdinal(d3.schemeTableau10);

for (let d of data) {
  total += d;
}

let angle = 0;

for (let d of data) {
  let endAngle = angle + (d / total) * 2 * Math.PI;
  arcData.push({ startAngle: angle, endAngle });
  angle = endAngle;
}

let index = 0
arcs.forEach(arc => {
    d3.select('svg').append('path').attr('d', arc).attr('fill', colors(index));
    index += 1;
  })
