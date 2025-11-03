let express = require('express');
let app = express();
 
app.use(express.static('public'));
app.listen(8080);
 
app.get('/search', myRequestHandler);

function myRequestHandler(req, res) {
    let question = req.query.q;
    console.log('Got search request: ', question);
    res.send('Hi! You searched for: ' + question);
}
