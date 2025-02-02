
import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
console.log('projects found');
renderProjects(projects, projectsContainer, 'h2');
document.querySelector("h1").innerText = `${projects.length} Projects`;
