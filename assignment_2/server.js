let express = require('express');
let app = express(); // create an express app for handling HTTP requests

app.listen(3000, function() {
    console.log('Server is listening on port 3000');
});


// handle JSON properly
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// serve static HTML to client from the "public" folder
app.use(express.static('public'));


let readout = []; // instantiate array for JSON to be displayed in readout.html




/* HELP! Why didn't this work? or do anything at the end? -- When this failed, i just put the "readout data array .push(choice)" method in the GET handling to do POST methods... is that just how Express works?

// POST handler for when the user chooses left or right
app.post('/left', leftRightHandler('/left'));
app.post('/right', leftRightHandler('/right'));

// helper function for leftRightHandler
// when the user clicks on left or right, this function POSTS their choice into the readout array
// readout array would be displayed if the user vitis readout.html

function leftRightHandler(choice) {
    return function(req, res) {
        readout.push(choice);
        res.redirect(choice);
    }
}
*/




// GET handler for index.html, left.html, right.html, and readout.html

app.get('/index.html', function(req, res) {
    readout = []; // reset readout array
    res.sendFile(__dirname + '/public/middleware/index.html');
});
app.get('/left.html', function(req, res) {
    readout.push('/left');
    res.sendFile(__dirname + '/public/middleware/left.html');
});
app.get('/right.html', function(req, res) {
    readout.push('/right');
    res.sendFile(__dirname + '/public/middleware/right.html');
});

app.get('/readout.html', function(req, res) {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Readout</title>
</head>
<body>
    <h1>Here's what you've done so far:</h1>
    <pre>${JSON.stringify(readout, null, 4)}</pre>
    <br><br>
    <a href=/index.html>Homepage</a>
</body>
</html>
    `);
});
