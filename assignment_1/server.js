// server.js - Launch Node.js Server

let http = require("http");
let fs = require("fs");
let server = http.createServer(requestHandler);

server.listen(8080);

function requestHandler(req,res){
    let path = req.url;
    let filePath = __dirname + path;
    console.log("Client requesting a file at: ", filePath);

    fs.readFile(filePath, function(err, data) {
        // check for errors before sending data
        if (err){
            console.log("Error getting data! Sending error status");
            res.writeHead(500);
            res.end("Server error accessing file!");
            return;
        }
        console.log("Got data! Let's send it to the client.");
        res.writeHead(200);
        res.end(data);
    })
}
