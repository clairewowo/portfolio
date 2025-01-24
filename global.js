
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


const navLinks = $$("nav a");

console.log(navLinks); // This will log an array of all <a> elements inside <nav>

let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );

  if (currentLink) {
    // or if (currentLink !== undefined)
    currentLink.classList.add('current');
  }
