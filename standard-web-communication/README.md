The purpose of this sample is to illustrate using standard web APIs to communicate betwen multiple components on a given page, such that it enables rendering the widgets on their own page. This demo uses no build or framework for clarity. Components are written using Custom HTML elements aka WebComponents for simplicity.

**Requirements**

- A localhost file server of choice on port 5001
- The [OpenFin CLI](https://developers.openfin.co/docs/openfin-cli-tool)

**Sample Usage**

_Shows both components within a single OpenFin Window_
```
http-server -p 5001 -c-1 --proxy http://localhost:5001?
openfin -l -c http://localhost:5001/app.json
```

_Shows both components within a multi-view OpenFin Platforms Application_
```
http-server -p 5001 -c-1
openfin -l -c http://localhost:5001/platform.json
```

Alternatively, it is possible to see the combined app or the individual compoents in a browser at the following URLs:

- http://localhost:5001/index.html
- http://localhost:5001/index.html?tiles
- http://localhost:5001/index.html?orders