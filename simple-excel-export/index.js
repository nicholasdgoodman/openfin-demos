const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();

const port = 3000;

app.use(express.static('public'));


app.listen(port, () => {
    console.log(`App listening on ${port}`);
    exec(`openfin -l -c http://localhost:${port}/app.json`);
});
