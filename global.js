
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const navLinks = $$("nav a");

console.log(navLinks); // This will log an array of all <a> elements inside <nav>

/*
let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );

  if (currentLink) {
    // or if (currentLink !== undefined)
    currentLink.classList.add('current');
  }
*/

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/index.html', title: 'Projects' },
  { url: 'contact/index.html', title: 'Contact' },
  { url: 'meta/index.html', title: 'Meta'},
  { url: 'resume/index.html', title: 'Resume' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');
for (let p of pages) {
  // let url = p.url;
  // let title = p.title;
  
  // if (!ARE_WE_HOME && !url.startsWith('http')) {
  //   url = '../' + url;
  // }
  // let a = document.createElement('a');
  // a.href = url;
  // a.textContent = title;
  // if (a.host === location.host && a.pathname === location.pathname) {
  //   a.classList.add('current');
  // }
  let a = document.createElement('a');
  nav.append(a);
  a.href = url;
  a.textContent = title;
  nav.append(a);

  a.classList.toggle(
    'current',
    a.host === location.host && 
    a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = "_blank";
  }
}

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith('http')) {
    if (ARE_WE_HOME) {
      url = basePath + url;
    } else {
      url = basePath + url;
    }
  }

  
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select id = 'theme-select'>
			<option>Automatic</option>
      <option>Light</option>
      <option>Dark</option>
		</select>
	</label>`
); 

const select = document.querySelector('select');

function setColorScheme(scheme) {
  document.documentElement.style.setProperty('color-scheme', scheme);
  select.value = scheme; // Update the dropdown to reflect the applied scheme
}

// On page load, check if a color scheme is stored in localStorage
document.addEventListener('DOMContentLoaded', () => {
  const savedScheme = localStorage.getItem('colorScheme');
  if (savedScheme) {
    setColorScheme(savedScheme); 
  } else {
    const defaultScheme = 'automatic'; 
    setColorScheme(defaultScheme);
    localStorage.setItem('colorScheme', defaultScheme); // Store default scheme
  }
});

// Listen for changes in the <select> element
select.addEventListener('input', function (event) {
  const newScheme = event.target.value;
  console.log('Color scheme changed to', newScheme);
  setColorScheme(newScheme);
  localStorage.setItem('colorScheme', newScheme); // Save the new scheme to localStorage
});

export async function fetchJSON(url) {
  try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      console.log(response)
      const data = await response.json();
      return data; 

  } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
  }
};

export function renderProjects(project, containerElement, headingLevel='h2', display_num=true) {
  if (display_num) {
    const header = document.querySelector('.projects-title');
    header.innerHTML = `<h1>${project.length} Projects</h1>`;
  }
  containerElement.innerHTML = '';
  for (let p of project) {
    const article = document.createElement('article');
    article.innerHTML = `
    <${headingLevel}>${p.title}</${headingLevel}>
    <img src="${p.image}" alt="${p.title}">
    <p>${p.description}</p>
    <p>${p.year}</p>
    `;
    containerElement.appendChild(article);
  }
  return true;
};

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
