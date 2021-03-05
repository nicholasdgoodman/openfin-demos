const express = require('express');

const { exec } = require('child_process');

const app = express();

const port = 3000;

app.use(express.static('public'));


app.listen(port, () => console.log(`App listening on ${port}`));

exec(`openfin -l -c http://localhost:${port}/app1.json`);

setTimeout(()=> {
    exec(`openfin -l -c http://localhost:${port}/app2.json`);
}, 5000);