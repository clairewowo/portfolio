import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js';

let projects = await fetchJSON('../lib/projects.json');
let searchInput = document.querySelector('.searchBar');
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Refactor all plotting into one function
let selectedIndex = -1;
function renderPieChart(projectsGiven) {
  // re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );
  // re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
  // re-calculate slice generator, arc data, arc, etc.
  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(100);
  
  let newSliceGenerator = d3.pie().value(d => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData;

  // TODO: clear up paths and legends
  let svg = d3.select('svg');
  svg.selectAll('path').remove();
  
  //let newSVG = d3.select('svg'); 
  //newSVG.selectAll('path').remove();
  d3.select('.legend').selectAll('li').remove();
  let legend = d3.select('.legend');
  // update paths and legends, refer to steps 1.4 and 2.2
  newArcs.forEach((one_arc, i) => {
    svg
      .append('path')
      .attr('d', arc(one_arc))
      .attr('fill', colors(i))
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        svg
          .selectAll('path')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : ''
          ));

        legend
        .selectAll('li')
        .attr('class', (_, idx) => (
          idx === selectedIndex ? 'selected' : ''
        ));

        if (selectedIndex === -1) {
          renderProjects(projects, projectsContainer, 'h2');
        } else {
        
        const selectedLabel = newData[selectedIndex].label; // Get the label from newData
        console.log(selectedLabel);
        const selectedProjects = projects.filter(project => project.year === selectedLabel);
        renderProjects(selectedProjects, projectsContainer, 'h2');
        }
      });
  });

  
}

// Call this function on page load

let projectsContainer = document.querySelector(".projects");
renderPieChart(projects);
renderProjects(projects, projectsContainer, 'h2');

let query = "";
// Define setQuery function
function setQuery(newQuery) {
  query = newQuery.toLowerCase();
  return projects.filter((project) => {
      let values = Object.values(project).join("\n").toLowerCase();
      return values.includes(query);
  });
}

searchInput.addEventListener('change', (event) => {
  let projectsContainer = document.querySelector(".projects")
  let filteredProjects = setQuery(event.target.value);
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});
