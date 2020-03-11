import './components.js';

(async function() {

let data = await (await fetch('./data.json')).json();

// Normally we might control this with URL Routes (e.g. React Router)
// but for this sample, just use query strings in the URL
let showTiles = !location.search || location.search.includes('tiles');
let showOrders = !location.search || location.search.includes('orders');

if(showTiles) {
    let tileCollection = document.createElement('tile-collection');
    tileCollection.tickers = [... new Set(data.map(d => d.ticker))];
    document.body.appendChild(tileCollection);
}

if(showOrders) {
    let orderTable = document.createElement('order-table');
    orderTable.rowData = data;
    document.body.appendChild(orderTable);
}

})();