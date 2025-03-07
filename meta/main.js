let data = [];
let commits = [];
let commitProgress = 100;

let filteredCommits = [];
let filteredLines = [];
let commitMaxTime = 0;
let files = [];
let lines = [];


function processCommits() {
  commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];

      // We can use object destructuring to get these properties
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/clairewowo/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        // What other options do we need to set?
        // Hint: look up configurable, writable, and enumerable
        writabe: false,
        configurable: true, 
        enumerable: false
      });

      return ret;
    });

    commits.sort((a, b) => a.datetime - b.datetime);
}

function calcMaxDay(days) {
  let day_freq = {};
  for (let d of days) {
    if (d in day_freq) {
      day_freq[d] += 1;
    }
    else {
      day_freq[d] = 0;
    }
  }
  let max = 0;
  let max_day = "";
  for (let d in day_freq) {
    if (day_freq[d] > max) {
      max = day_freq[d];
      max_day = d;
    }
  }
  if (max_day === 'Fri' || max_day === 'Mon' || max_day === 'Sun') {
    max_day += 'day';
  }
  else if (max_day === 'Thu') {
    max_day += 'rsday';
  }
  else if (max_day === 'Wed') {
    max_day += 'nesday';
  }
  else if (max_day === 'Sat') {
    max_day += 'urday';
  }
  else { // Tuesday
    max_day + 'sday';
  }
  return max_day;
}


function displayStats() {
  // Process commits first
  processCommits();

  lines = commits.flatMap((d) => d.lines);
  console.log(lines);
  // Create the dl element
  d3.select('#stats').html('')
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');


  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(lines.length);

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // Add more stats as needed...
  dl.append('dt').text('Longest file');
  let file_lengths = lines.map(entry => entry.line);
  let max = 0;
  for (let l of file_lengths) {
    if (l > max) {
      max = l;
    }
  }
  dl.append('dd').text(max + ' lines');

  dl.append('dt').text('Number of code files');
  let codeFiles = lines.map(entry => entry.file);
  let unique_files = new Set(codeFiles);
  dl.append('dd').text(unique_files.size);

  dl.append('dt').text('Most common day for commits: ');
  let days = commits.map(entry => entry.date.toString().slice(0, 3));
  dl.append('dd').text(calcMaxDay(days));
}

async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  
  commits = d3.groups(data, (d) => d.commit);
  
}

const w = 1000;
const h = 600;
let yScale = d3.scaleLinear().domain([0, 24]).range([h, 0]);;
let xScale = d3
  .scaleTime()
  .domain(d3.extent(filteredCommits, (d) => d.datetime))
  .range([0, w])
  .nice();

let brushSelection = null;
let selectedCommits =[];
function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function updateSelectionCount() {
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  //return selectedCommits;
}

function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );


  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
  return breakdown;
}

function updateSelection() {
  // Update visual state of dots based on selection
  d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function brushed(evt) {
  brushSelection = evt.selection;
  selectedCommits = !brushSelection
    ? []
    : filteredCommits.filter((commit) => {
        let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
        let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
        let x = xScale(commit.date);
        let y = yScale(commit.hourFrac);

        return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
      });
  
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}


function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  if (Object.keys(commit).length === 0) {
    return;
  }
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
}

function brushSelector() {
  const svg = document.querySelector('svg');
  d3.select(svg).call(d3.brush().on('start brush end', brushed));
  d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function updateScatterplot(commits) {
  const width = 1000;
  const height = 600;
  d3.select('svg').remove();
  let svg = d3.select('#chart-1').append('svg');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  d3.select('#chart-1').html('');
  svg = d3
    .select('#chart-1')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Update scales with new ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
  .axisLeft(yScale)
  .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([7, 20]);

  svg.selectAll('g').remove()
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('class', 'dots')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('fill', 'steelblue')
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      d3.select(event.currentTarget).classed('selected', true); // give it a corresponding boolean value
      updateTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event, commit) => {
      updateTooltipContent({});
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      d3.select(event.currentTarget).classed('selected', false);
      updateTooltipVisibility(false);
    });
  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // Add Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
  
  brushSelector();
}

function unitVisualization() {
  files = d3
    .groups(filteredLines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });

  files = d3.sort(files, (d) => -d.lines.length);
  d3.select('.files').selectAll('div').remove(); // clear everything first
  let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');

  filesContainer.append('dt').append('code').text(d => d.name);
  filesContainer.append('dd').text(d => `${d.lines.length} lines`);
  
  let allTypes = new Set();

  // Use map() to extract 'type' from the bound data and add it to the Set
  filesContainer.each(function(d) {
    allTypes.add(d.lines[0].type);
  });

  let fileTypeColors = d3.scaleOrdinal().domain([...allTypes]).range(d3.schemeTableau10);

  filesContainer.selectAll('dd').each(function(d) { // Use each() to work with the bound data
    d3.select(this) // Select the current dd element
        .selectAll('div')
        .data(d3.range(d.lines.length)) // Generate an array of length d.lines.length
        .enter()
        .append('div')
        .attr("class", "line")
        .style("background", fileTypeColors(d.lines[0].type))
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  console.log('data loaded');
  
  let NUM_ITEMS = commits.length; // Ideally, let this value be the length of your commit history
  let ITEM_HEIGHT = 80; // Feel free to change
  let VISIBLE_COUNT = 8; // Feel free to change as well
  let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
  const scrollContainer1 = d3.select('#scroll-container-1');
  const spacer = d3.select('#spacer-1');
  spacer.style('height', `${totalHeight}px`);
  const itemsContainer1 = d3.select('#items-container-1');

  function renderItemsChart(startIndex) {
    // Clear things off
    itemsContainer1.selectAll('div').remove();
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);
    filteredCommits = newCommitSlice;
    // TODO: how should we update the scatterplot (hint: it's just one function call)
    updateScatterplot(newCommitSlice);

    newCommitSlice.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    // Re-bind the commit data to the container and represent each using a div
    itemsContainer1.selectAll('div')
                  .data(commits)
                  .enter()
                  .append('div')
                  .html((commit, index) => `On ${commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle:
  "short"})}, I made
        <a href="${commit.url}" target="_blank">
            ${index > 0 ? 'yet another commit' : 'my first commit, and it was glorious'}
        </a>. I edited ${commit.totalLines} lines across 
        ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. 
        Then I looked over all I had made, and everything was functional.
    `)
                  .style('position', 'absolute')
                  .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
  }

  const scrollContainer2 = d3.select('#scroll-container-2');
  
  const spacer2 = d3.select('#spacer-2');
  spacer2.style('height', `${totalHeight}px`);
  const itemsContainer2 = d3.select('#items-container-2');

  function displayCommitFiles(filteredCommits) {
    const lines = filteredCommits.flatMap((d) => d.lines);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
    let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
      return { name, lines };
    });
    files = d3.sort(files, (d) => -d.lines.length);
    d3.select('.files').selectAll('div').remove();
    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
    filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    filesContainer.append('dd')
                  .selectAll('div')
                  .data(d => d.lines)
                  .enter()
                  .append('div')
                  .attr('class', 'line')
                  .style('background', d => fileTypeColors(d.type));
    
    
    unitVisualization();
  }

  function renderItemsFiles(startIndex) {
    // Clear things off
    itemsContainer2.selectAll('div').remove();
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);
    let filteredCommits2 = newCommitSlice;
    filteredLines = filteredCommits2.flatMap((d) => d.lines);

    newCommitSlice.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    // Re-bind the commit data to the container and represent each using a div
    itemsContainer2.selectAll('div')
                  .data(commits)
                  .enter()
                  .append('div')
                  .html((commit, index) => `On ${commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle:
  "short"})}, I made
        <a href="${commit.url}" target="_blank">
            ${index > 0 ? 'yet another commit' : 'my first commit, and it was glorious'}
        </a>. I edited ${commit.totalLines} lines across 
        ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. 
        Then I looked over all I had made, and I saw that it was very good.
    `)
                  .style('position', 'absolute')
                  .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
    displayCommitFiles(filteredCommits2);
  }

  
  scrollContainer1.on('scroll', () => {
    const scrollTop = scrollContainer1.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItemsChart(startIndex);
  });

  scrollContainer2.on('scroll', () => {
    const scrollTop = scrollContainer2.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItemsFiles(startIndex);
  })
  displayStats();
  renderItemsChart(0);
  renderItemsFiles(0);
});
