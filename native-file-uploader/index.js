const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();

const port = 3000;

app.use('/upload', bodyParser.raw({type: 'application/octet-stream', limit : '2mb'}));

app.post('/upload', function (req, res) {
    console.log('Got Upload');
    console.log(req.body);
    res.send('File uploaded');
    //res.send('POST request to the homepage')
});

app.use(express.static('public'));


app.listen(port, () => console.log(`App listening on ${port}`));

exec(`openfin -l -u http://localhost:${port}/index.html`);