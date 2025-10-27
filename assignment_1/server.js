// server.js -- Launch Node.js Server

let http = require("http");
let fs = require("fs");
let server = http.createServer(requestHandler);

server.listen();

function requestHandler(req, res){
    console.log(req);
}

