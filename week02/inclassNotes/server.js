// server.js
let express = require('express');
let app = express();

app.use(express.static('public'));
app.listen(8080);

app.get('/search', myRequestHandler);
app.post('/shareSecret', mySecretRequestHandler);

function myRequestHandler(req, res) {
	let question = req.query.q;
	console.log('Got search request: ', question);
	res.send('Hi! You searched for: ' + question);
}

function mySecretRequestHandler(req, res) {
	console.log = (req.body);
	console.log('Got secret request');
	res.send('Thanks for sharing your secret!');

	// print the incoming body JSON data to console
	console.log(req.body);

	// parse the json from the request body
	let json = JSON.parse(req.body);

	let secret = req.body.secret;
	secrets.push(secret);
	console.log('Got POST request to /shareSecret w      ith secret: ' + secret);
}

app.get('/secrets', myGetSecretsRequestHandler);

function myGetSecretsRequestHandler(req, res) {
	res.send(secrets);
}

