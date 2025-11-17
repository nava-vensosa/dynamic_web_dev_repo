// instantiate express app
let express = require('express');
let fs = require('fs');
let app = express();

app.use(express.urlencoded({ extended: true }));

// designate public & views folders
app.use(express.static('public'));
app.set('views', 'views');

// set ejs as view engine
app.set('view engine', 'ejs');

// set port
app.listen(8080);

// set up routes
app.get('/', (req, res) => {
    res.render('index', index_content);
});

app.get('/prompt', (req, res) => {
    res.render('prompt');
});

app.get('/names', (req, res) => {
   // read names from json file
   let names = JSON.parse(fs.readFileSync('names.json', 'utf8'));
  res.render('names', { names: names });
});

// POST route handling for prompt page
app.post('/prompt', (req, res) => {
    // read the names from the json file
    let names = JSON.parse(fs.readFileSync('names.json', 'utf8'));
    // the names variable is now an array of names (i believe?); we want to add the user's input to this array
    names.push(req.body.name);

    // write the edited names array to the json file
    fs.writeFileSync('names.json', JSON.stringify(names));
    // Here's your missing piece!!! You need to redirect the user to a page, or the page will spin forever waiting for a response! so, redirect to the same page if you don't want it to change pages right away
	// Also, you need a package.json to ensure express and ejs are installed on the server
});


// write the content for the index.ejs generated page

let index_content = {
    title: "Homepage",
    paragraph1: "Welcome to the landing site!"
};
