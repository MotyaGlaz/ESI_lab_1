const data = dataset;
const tableId = "data-table";
const graphId = "graph-svg";

d3.select("#graph-svg")
    .attr("width", 0)
    .attr("height", 0);

fillTable(tableId, data);
addFilters(data);
addGroupings(data);
setUpFilterForm();
setUpSortForm();
setUpGroupingForm();

let sortingOptions = Object.keys(data[0]).sort();
let currentValue;

function setUpFilterForm() {
    const filterForm = document.querySelector('#filter-form');

    filterForm.addEventListener('submit', filterFormSubmit);
    filterForm.addEventListener('reset', formReset);
}

function setUpSortForm() {
    const newSortFieldButton = document.querySelector('#new-sort-field-button');
    const sortForm = document.querySelector('#sort-form');

    newSortFieldButton.addEventListener('click', addSorting);
    sortForm.addEventListener('submit', sortFormSubmit);
    sortForm.addEventListener('reset', formReset);
}

function setUpGroupingForm() {
    const groupingForm = document.querySelector('#group-form');

    groupingForm.addEventListener("submit", groupingFormSubmit);
    groupingForm.addEventListener("reset", formReset);
}

function addSorting(event) {
    const template = document.querySelector('#sort-field-template');
    const dataNum = +template.getAttribute('data-num');
    template.setAttribute('data-num', (dataNum + 1).toString());

    const item = template.content.cloneNode(true);
    item.querySelector('fieldset').id = 'sort-' + dataNum;
    item.querySelectorAll('.sorting-input').forEach(elem => {
        elem.setAttribute('name', 'sort-' + dataNum);
    });
    this.before(item);

    const elem = document.querySelector('#sort-' + dataNum);

    fillSortingOptions(elem, sortingOptions);


    const button = elem.querySelector('button');

    button.addEventListener('click', function () {
        elem.parentNode.removeChild(elem);
    });


    const select = elem.querySelector('select');

    select.addEventListener('focus', function (event) {
        currentValue = event.target.value;
    });

    select.addEventListener('change', function (event) {
        const newValue = event.target.value
        sortingOptions = sortingOptions.filter(elem => elem !== newValue).concat([currentValue]).sort();
    });

    sortingOptions = sortingOptions.slice(1);
}

function filterFormSubmit(event) {
    event.preventDefault();

    let formData = Array.from(serializeForm(this).entries());
    // console.log(formData);

    let filters = [];
    let i = 0;
    while (i < formData.length) {
        let [name, value] = formData[i];

        if (i + 1 < formData.length && formData[i + 1][0] === name) {
            let j = i;
            let values = [];

            while (j < formData.length && formData[j][0] === name) {
                values.push(formData[j][1]);
                j++;
            }
            filters.push([name].concat(values));
            i = j;
        } else {
            filters.push([name, value]);
            i++;
        }
    }
    // console.log(filters);

    filterTable(tableId, filters);
}

function sortFormSubmit(event) {
    event.preventDefault();

    let formData = Array.from(serializeForm(this).entries());
    // console.log(formData);

    let filters = [];
    let sortKeys = [];
    let i = 0;
    while (i < formData.length) {
        let [name, value] = formData[i];

        const isAscending = formData[i + 1][1] === '1';
        sortKeys.push([value, isAscending]);
        i += 2;
    }
    // console.log(sortKeys);

    sortTable(tableId, sortKeys);
}

function groupingFormSubmit(event) {
    event.preventDefault();

    const formData = Array.from(serializeForm(this).entries());
    // console.log(formData);

    const groupKey = "Continent";
    const groupValue = formData[0][1];
    // console.log(groupKey, groupValue);

    groupTable(tableId, data, groupKey, groupValue);
    drawGraph(graphId, data, groupKey, groupValue);
}

function formReset(event) {
    window.location.reload();
}

/*
===================
Функции для работы с формой
===================
 */

function addFilters(data) {
    let keys = Object.keys(data[0]);

    d3.select('#filter-form')
        .select('.inputs')
        .selectAll('input')
        .data(keys)
        .enter()
        .append(d => getInputTagFromKey(data, d.toString()), keys);
}

function addGroupings() {
    const keys = ["Latitude", "Longitude", "Magnitude"];
    d3.select('#group-form')
        .select('#group-select-values')
        .selectAll('option')
        .data(keys)
        .enter()
        .append('option')
        .text(d => d);
}

function getInputTagFromKey(data, key) {
    let elem = document.createElement("label");
    d3.select(elem)
        .attr('class', 'block-input')
        .append('span')
        .attr("class", "input-label")
        .text(key);

    const name = key;

    switch (key) {
        case "Place":
        case "Country":
            d3.select(elem)
                .append("input")
                .attr('name', name)
                .attr("type", "text")
                .attr("placeholder", key);
            return elem;
        case "Continent":
            d3.select(elem)
                .append("select")
                .attr('name', name)
                .selectAll("option")
                .data(['All'].concat(getKeyGroup(data, key)))
                .enter()
                .append('option')
                .text(d => d !== null ? d : "—");
            return elem;
        default:
            const min = getMinFromKey(data, key);
            const max = getMaxFromKey(data, key);
            d3.select(elem)
                .append("input")
                .attr('name', name)
                .attr('type', 'number')
                .attr('placeholder', 'от ' + min)
                .attr('step', '0.1')
                .attr('min', min)
                .attr('max', max)
                .text(d => d);
            d3.select(elem)
                .append("input")
                .attr('name', name)
                .attr('type', 'number')
                .attr('placeholder', 'до ' + max)
                .attr('step', '0.1')
                .attr('min', min)
                .attr('max', max)
                .text(d => d);
            return elem;
    }
}

function getMinFromKey(data, key) {
    return d3.min(data, d => d[key]);
}

function getMaxFromKey(data, key) {
    return d3.max(data, d => d[key]);
}

function getKeyGroup(data, key) {
    let groupObj = d3.group(data, d => d[key]);
    return [...groupObj.keys()];
}


/*
===================
Функции для работы с таблицей
===================
 */

// создание таблицы
function fillTable(tableId, data) {

    let table = d3.select(`#${tableId}`);

    clearTable(tableId);
    fillTableHeader(tableId, data);
    fillTableRows(table, data);
    fillTableCells(table, data);

    return table;
}

function sortTable(tableId, sortKeys) {
    // console.log(sortKeys);
    const table = d3.select(`#${tableId}`)
        .select("tbody");
    
        
    table.selectAll("tr")
        .sort((a, b) => {
            let result;
            for (let [sortKey, isAscending] of sortKeys) {
                if (a[sortKey] !== b[sortKey]) {
                    result = isAscending ? dataSort(a[sortKey], b[sortKey]) : dataSort(b[sortKey], a[sortKey]);
                    break;
                }
            }
            return result;
    });
}

function filterTable(tableId, filters) {
    const table = d3.select(`#${tableId}`);
    
    fillTable(tableId, data);
    
    for (let item of filters) {
        const key = item.shift();
        const values = item;

        if (['', 'All', 'all', '—'].includes(values[0])) {
            continue;
        }

        console.log(values)

        if (values.length === 1) {
            table.selectAll("tr")
                .filter(d => !(d[key] == values[0]))
                .style("display", "none");
        } else {
            table.selectAll("tr")
                .filter(d => !(+d[key] >= +values[0] && +d[key] <= +values[1]))
                .style("display", "none");
        }

    }
}

function fillSortingOptions(select, sortingOptions) {
    d3.select(select)
        .select('select')
        .selectAll('option')
        .data(sortingOptions)
        .enter()
        .append('option')
        .text(d => d);
}

function serializeForm(formNode) {
    return new FormData(formNode)
}

function groupTable(tableId, data, groupKey, groupValue) {
    const groupObj = d3.group(data, d => d[groupKey]);
    // console.log(groupObj);
    let groupData = [];

    groupObj.forEach((value, key) => {
        const minMax = d3.extent(value.map(d => d[groupValue]));
        const sum = d3.sum(value.map(d => d[groupValue]));

        const amount = value.length;
        const [min, max] = minMax;
        const mean = sum / value.length;
        groupData.push({[`${groupValue}`]: key, amount: amount, min: min, max: max, mean: mean});
    });

    // console.log(arrGraph);
    fillTable(tableId, groupData);
}

function dataSort(a, b) {
    if (typeof a == "string") {
        return a.localeCompare(b);
    } else if (typeof a == "number") {
        return a > b ? 1 : a === b ? 0 : -1;
    } else if (typeof a == "boolean") {
        return b ? 1 : a ? -1 : 0;
    }
}

// создание шапки таблицы
function fillTableHeader(tableId, data) {
    return d3.select(`#${tableId}`)
        .select("thead")
        .selectAll("th")
        .data(Object.keys(data[0]))
        .enter()
        .append("th")
        .text(d => d);
}

// создание строк таблицы
function fillTableRows(table, data) {
    return table.select("tbody")
        .selectAll("tr")
        .data(data)
        .enter()
        .append('tr');
}

// создание ячеек каждой строки на основе каждого элемента
function fillTableCells(table) {
    return table.selectAll("tbody tr")
        .selectAll("td")
        .data(d => Object.values(d))
        .enter()
        .append("td")
        .text(d => d);
}

// очистка таблицы
function clearTable(tableId) {
    d3.select(`#${tableId}`)
        .select("tbody")
        .selectAll("*")
        .remove();
    d3.select(`#${tableId}`)
        .select("thead")
        .selectAll("*")
        .remove();
}


/*
===================
Функции для работы с графом
===================
 */

let svg;

function drawGraph(graphId, data, groupKey, groupValue,
                   width = 800, height = 400,
                   marginX = 40, marginY = 80) {
    svg = d3.select(`#${graphId}`);
    svg.attr("width", width)
        .attr("height", height)
        .selectAll('*').remove();

    // создаем массив для построения графика
    const graphData = createArrGraph(data, groupKey, groupValue);
    // console.log(graphData);

    // создаем шкалы преобразования и выводим оси
    const [scaleX, scaleY] = createAxis(graphData, width, height, marginX, marginY);

    // рисуем графики

    firstStep(graphData, createPath(marginX, marginY, scaleX, scaleY, "purple", 2));

    createChart(graphData, marginX, marginY, scaleX, scaleY, "blue", 0);
    createChart(graphData, marginX, marginY, scaleX, scaleY, "red", 1);
    createChart(graphData, marginX, marginY, scaleX, scaleY, "purple", 2);
}

function createArrGraph(data, groupKey, groupValue) {
    let groupObj = d3.group(data, d => d[groupKey]);
    let arrGraph = [];

    groupObj.forEach((value, key) => {
        const minMax = d3.extent(value.map(d => d[groupValue]));
        const sum = d3.sum(value.map(d => d[groupValue]));
        const values = [minMax[0], minMax[1], sum / value.length]
        arrGraph.push({labelX: key, values: values});
    });

    // console.log(arrGraph);
    return arrGraph;
}

function createAxis(graphData, width, height, marginX, marginY) {

    // в зависимости от выбранных пользователем данных по OY
    // находим интервал значений по оси OY
    let firstRange = d3.extent(graphData.map(d => d.values[0]));
    let secondRange = d3.extent(graphData.map(d => d.values[1]));

    let min = firstRange[0];
    let max = secondRange[1];

    // функция интерполяции значений на оси
    let scaleX = d3.scaleBand()
        .domain(graphData.map(d => d.labelX))
        .range([0, width - 2 * marginX]);
    let scaleY = d3.scaleLinear()
        .domain([min, max * 1.1])
        .range([height - 2 * marginY, 0]);

    // создание горизонтальной и вертикальной оси
    let axisX = d3.axisBottom(scaleX);
    let axisY = d3.axisLeft(scaleY);

    // отрисовка осей в SVG-элементе
    svg.append("g")
        .attr("transform", `translate(${marginX}, ${height - marginY})`)
        .call(axisX)
        .selectAll("text") // подписи на оси — наклонные
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", d => "rotate(-45)");

    svg.append("g")
        .attr("transform", `translate(${marginX}, ${marginY})`)
        .call(axisY);

    return [scaleX, scaleY]
}

function createChart(data, marginX, marginY, scaleX, scaleY, color, index) {

    svg.selectAll(".dot")
        .data(data).enter()
        .append("circle")
        .attr("r", 4)
        .attr("cx", d => scaleX(d.labelX) + scaleX.bandwidth() / 2)
        .attr("cy", d => scaleY(d.values[index]))
        .attr("transform", `translate(${marginX}, ${marginY})`)
        .style("fill", color);
}

// Создаёт линию для вывода точек массива на график и добавляет путь для его отображения
function createPath(marginX, marginY, scaleX, scaleY, color, index) {

    let lineXY = d3.line()
        .x(d => scaleX(d.labelX))
        .y(d => scaleY(d.values[index]));

    svg.append("path") // добавляем путь
        .attr("id", "graph")
        .attr("transform", `translate(${marginX * 2.3}, ${marginY})`)
        .style("stroke-width", "4")
        .style("stroke", color);

    return lineXY;
}

// Выводит динамический график
function firstStep(data, line) {

    const firstPath = svg.select("path#graph")
        .datum(data)
        .attr("d", line);

    const pathLength = firstPath.node().getTotalLength();

    firstPath.attr("stroke-dashoffset", pathLength)
        .attr("stroke-dasharray", pathLength)
        .transition()
        .ease(d3.easeLinear)
        .duration(5000)
        .attr("stroke-dashoffset", 0);
}