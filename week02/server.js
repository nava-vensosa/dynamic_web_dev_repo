let express = require('express');
let app = express();
 
app.use(express.static('public'));
 
app.get('/search', myRequestHandler);

function myRequestHandler(req, res) {
    let question = req.query.q;
    console.log('Got search request: ', question);
    res.send('Hi! You searched for: ' + question);
}

app.listen(8080);
