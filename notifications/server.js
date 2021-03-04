const httpServer = require('http-server');
const path = require('path');
const runtime = require('hadouken-js-adapter');

const serverParams = {
    root: path.resolve('./'),
    port: 5555,
    open: false,
    logLevel: 2,
    cache: -1
};

const appJson = 'app.json';
const manifestFile = appJson;

//To Launch the OpenFin Application we need a manifestUrl.
const manifestUrl = `http://localhost:${serverParams.port}/${manifestFile}`;

//Start the server server
const server = httpServer.createServer(serverParams);
server.listen(serverParams.port);
(async() => {
    try {
        console.log('Launching application from:', manifestUrl);
        //Once the server is running we can launch OpenFin and retrieve the port.
        const port = await runtime.launch({ manifestUrl });

        //We will use the port to connect from Node to determine when OpenFin exists.
        const fin = await runtime.connect({
            uuid: 'server-connection', //Supply an addressable Id for the connection
            address: `ws://localhost:${port}`, //Connect to the given port.
            nonPersistent: true //We want OpenFin to exit as our application exists.
        });

        //Once OpenFin exists we shut down the server.
        fin.once('disconnected', process.exit);
    } catch (err) {
        console.error(err);
    }
})();
