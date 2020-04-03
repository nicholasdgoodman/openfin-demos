# App Plotly on OpenFin


## Purpose

This repository is a quick demonstration of client-side, cross-context communication between one or more Dash Plotly Apps running in the OpenFin container.

## Disclaimer

This example code is meant to illustrate how one can acheive OpenFin / Dash Plotly integrations. It will not be regularly maintained or supported, and it is not intended to be used directly in a production capacity.

## Running

_requires the OpenFin CLI_

In one terminal instance start the Dash Plotly server:

```
python app.py
```

and elsewhere start OpenFin instead of a browser:

```
openfin -l http://localhost:8050/platform.json
```

## Summary of Functionality

The main Dash Plotly app is contained in the file _app.py_, and renders different content depending on the route specified in the address. The same functionality could also be achieved if the apps were completely separated on different Python instances.

The dropdown on `/page-1` registers a client-side callback that is defined in the asset file _assets/openfin-addins.js_. Whenever the dropdown value changes it sends the updated value across the client-side OpenFin message bus.

On every open window in this app, the same asset file creates a subscription on the same topic, and when a message is received it updates the specified input by element ID. Due to the nature of React event debouncing, some degree of manual value setting and event raising is required. A matching element is found on `/page-2` and the text input value is synchronized with the last set value from the first page.

## Known Issues

(Mostly due to unfamiliarity with Dash Plotly)

- Currently the element ID which is to be updated is hard-coded when the client side message is dispatched. The sample was designed to illustrate how this could be genericized in the future.
- The client-side callback unnecessarily pushes the dropdown `value` into the dropdown `innerText` as it appears that callbacks in Dash must return a value that gets pushed to the DOM somewhere.
