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
        url: 'https://github.com/clairewowo/DSC106-lab1/commit/' + commit,
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

  // Create the dl element
  d3.select('#stats').html('')
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(filteredLines.length);

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(filteredCommits.length);

  // Add more stats as needed...
  dl.append('dt').text('Longest file');
  let file_lengths = filteredLines.map(entry => entry.line);
  let max = 0;
  for (let l of file_lengths) {
    if (l > max) {
      max = l;
    }
  }
  dl.append('dd').text(max + ' lines');

  dl.append('dt').text('Number of code files');
  let codeFiles = filteredLines.map(entry => entry.file);
  let unique_files = new Set(codeFiles);
  dl.append('dd').text(unique_files.size);

  dl.append('dt').text('Most common day for commits: ');
  let days = filteredCommits.map(entry => entry.date.toString().slice(0, 3));
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
  
  // this was included before
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
  let svg = d3.select('#chart').append('svg');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  d3.select('#chart').html('');
  svg = d3
    .select('#chart')
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
  console.log(allTypes);

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

  displayStats();
  console.log('data loaded');
  
  let timeScale = d3.scaleTime([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)], [0, 100]);
  const timeSlider = d3.select('#timeBar');
  const selectedTime = d3.select('#selectedTime');

  function updateTime() {
    let commitProgress = Number(timeSlider.property("value")) || 0;
    commitMaxTime = timeScale.invert(commitProgress);
    selectedTime.text(commitMaxTime.toLocaleString(undefined, { 
      dateStyle: "long", 
      timeStyle: "short" 
    }));

    filteredCommits = commits.filter(d => d.datetime < commitMaxTime);
    filteredLines = data.filter(d => d.datetime < commitMaxTime);
    displayStats();
    unitVisualization();
    updateScatterplot(filteredCommits);
  }

  // Attach event listener for slider movement
  timeSlider.on("input", updateTime);

  // Initialize with default value
  updateTime();
});
