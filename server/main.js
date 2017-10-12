var http = require('http');
var urlUtil = require('url');
var queryUtil = require('querystring');
var messages = require("./messages-util");

var server = http.createServer(function(request, response) {

    response.setHeader('Access-Control-Allow-Origin', '*');
    request.setTimeout(600000);

    var url = urlUtil.parse(request.url);
    var href = url.href;

    // remove expired responses object on request close
    request.on('close', function(chunk) {
        messages.removeExpired(response);
    });
    
    // get messages
    if(href.startsWith("/messages?")){
        if(request.method == "GET"){
            var counter = (queryUtil.parse(url.query)).counter;
            if(!counter || isNaN(counter)) 
                badRequest(response);
            // push clients for long polling
            messages.pushClient(response);
            var newMessages = messages.getMessages(counter);
            if (newMessages.length > 0) {
                response.end(JSON.stringify(newMessages));
                messages.removeExpired(response); // remove client
            }
        }
        else
            notAllowed(response);
    } 
    // post message 
    else if (href == "/messages") {
        if(request.method == "POST") {
            var requestBody = ''; 
            request.on('data', function(chunk) {
                requestBody += chunk.toString();
            });
            request.on('end', function() {
                var requestObj = JSON.parse(requestBody);
                if (!requestObj)
                    badRequest(response);
                var id = messages.addMessage(requestObj);
                response.end(JSON.stringify({id: id}));
            });
        }
        else 
            notAllowed(response);
    }
    else if(href.startsWith("/messages/")){
        if(request.method == "DELETE"){
            if(isNaN(href.substring(10)))
                badRequest(response);
            messages.deleteMessage(href.substring(10));
            response.end("true");  
        }
        // send permissions for deleting request
        else if (request.method === 'OPTIONS') {
            var headers = {};
            headers["Access-Control-Allow-Origin"] = "*";
            headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
            headers["Access-Control-Allow-Credentials"] = false;
            headers["Access-Control-Max-Age"] = '86400'; // 24 hours
            headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
            response.writeHead(204, headers);
            response.end();
        }
        else
            notAllowed(response);
    }
    else if (href == "/stats") {
        if(request.method == "GET"){
            var status = messages.getStatus();
            response.end(JSON.stringify(status));
        }
        else
            notAllowed(response);
    }
    // long polling for stats or deleting messages
    else if(href.startsWith("/pollStatus")) {
        messages.pushStatusClient(response);
        var requestObj = queryUtil.parse(url.query);
        // check if stats not updated
        messages.needUpdate(requestObj);
    }
    // if client closed window/tab
    else if(request.url == "/logout"){
        messages.removeClient();
        response.end();
    }
    else if (request.url == "/login"){
         messages.addClient();
         response.end();
    }
    else if (request.method === 'OPTIONS') {
        response.writeHead(204);
        response.end();
    }  
    else {
        response.writeHead(404);
        response.end();
    }
});

function badRequest(response) {
    response.writeHead(400);
    response.end();
}

function notAllowed(response) {
    response.writeHead(405);
    response.end();
}

server.listen(9000);
console.log('listening...');