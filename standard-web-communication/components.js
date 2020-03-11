const TICKERCHANNEL = 'ticker-hover-channel';

class TickerTile extends HTMLElement {
    constructor() {
        super();
        this.state = { ticker: '' };
        
        this.channel = new BroadcastChannel(TICKERCHANNEL);
    }

    set ticker(ticker) {
        Object.assign(this.state, { ticker });
    }

    connectedCallback() {
        this.innerHTML = `<div>${this.state.ticker}</div>`;

        // The following code could be extracted into its own helper
        // object / class, but keep it verbose for clarity, for now
        this.addEventListener('mouseover', () => {
            this.channel.postMessage({ ticker: this.state.ticker, active: true });
        });

        this.addEventListener('mouseout', () => {
            this.channel.postMessage({ ticker: this.state.ticker, active: false });
        });

        this.channel.addEventListener('message', ({ data }) => {
            if(data.active && data.ticker === this.state.ticker) {
                this.classList.add('highlight');
            }
            else {
                this.classList.remove('highlight');
            }
        });
    }
}

class TileCollection extends HTMLElement {
    set tickers(value) {
        value.forEach(ticker => {
            let tile = document.createElement('ticker-tile');
            tile.ticker = ticker;
            this.appendChild(tile);
        });
    }
}

class OrderRow extends HTMLElement {
    constructor() {
        super();
        this.state = { data: null };

        this.channel = new BroadcastChannel(TICKERCHANNEL);
    }

    set data(data) {
        Object.assign(this.state, { data })
    }

    connectedCallback() {
        if(this.state.data) {
            this.innerHTML = `<div>${this.state.data.ticker}</div>`;

            // The following code could be extracted into its own helper
            // object / class, but keep it verbose for clarity, for now
            this.addEventListener('mouseover', () => {
                this.channel.postMessage({ ticker: this.state.data.ticker, active: true });
            });
    
            this.addEventListener('mouseout', () => {
                this.channel.postMessage({ ticker: this.state.data.ticker, active: false });
            });
    
            this.channel.addEventListener('message', ({ data }) => {
                if(data.active && data.ticker === this.state.data.ticker) {
                    this.classList.add('highlight');
                }
                else {
                    this.classList.remove('highlight');
                }
            });
        }
    }
}

class OrderTable extends HTMLElement {
    set rowData(value) {
        value.forEach(data => {
            let orderRow = document.createElement('order-row');
            orderRow.data = data;
            this.appendChild(orderRow);
        });
    }
}


customElements.define('ticker-tile', TickerTile);
customElements.define('tile-collection', TileCollection)
customElements.define('order-row', OrderRow);
customElements.define('order-table', OrderTable)