var messages = [];
var index = 0; // index for messages id
var clients = []; 
var clientNum = 0; // connected user
var statusClients = []; 
var util = require('util');
var md5 = require('md5');

exports.addMessage = function (message) {
	index++;
	message.id = index;
	// add img property
	if(message.email)
	    message.img = 'http://www.gravatar.com/avatar/' + md5(message.email) + '.jpg';
	// img for anonymous
	if(message.email == "") 
		message.img = 'https://i.imgur.com/41XhbZK.jpg';
	messages.push(message);
	// send new message to all the clients
	while(clients.length > 0) {
		var client = clients.pop();
		if(client.socket && client.socket.writable) {
			client.end(JSON.stringify(messages.slice(messages.length-1)));
		}
	}
	return index;
};

exports.getMessages = function (counter) {
	if (messages.length > counter) {
		return messages.slice(counter);
	}
	else
		return [];
}

exports.pushClient = function (response) {
	clients.push(response);
}

// remove expired responses object
exports.removeExpired = function (response) {
	for(var i = 0; i < clients.length; i++) {
		if(clients[i] == response) {
			clients.splice(i, 1);
			return;
		}
	}
	for(var i = 0; i < statusClients.length; i++){
		if(statusClients[i] == response) {
			statusClients.splice(i, 1);
			return;
		}
	}
}

exports.addClient = function() {
	clientNum++;
	sendStatus(); // send updated stats to all the clients
}

exports.removeClient = function() {
	clientNum--;
	sendStatus();
}

exports.pushStatusClient = function (response) {
	statusClients.push(response);
}

// id is deleted message id, if there is
function sendStatus(id) {
	while(statusClients.length > 0) {
		var client = statusClients.pop();
		if(client.socket && client.socket.writable) {
			if(!id)
		    	client.end(JSON.stringify({users: clientNum, messages: messages.length}));
		    else 
		    	client.end(JSON.stringify({users: clientNum, messages: messages.length, deleteId: id}));
		}
	}
}

// check if the stats not updated for certain client
exports.needUpdate = function (data) {
	if(data.users != clientNum || data.messages != messages.length) {
		sendStatus();
	}
}

exports.deleteMessage = function (id) {
	var flag = 0;
	// search message
	for(var i = 0; i < messages.length; i++){
		if (messages[i].id == id){
			messages.splice(i,1);
			flag = 1;
			break;
		}
	}
	// no message with id found
	if(flag == 0)
		return;
	// let all the clients know message deleted
	while(clients.length > 0) {
		var client = clients.pop();
		if(client.socket && client.socket.writable) {
			client.end(JSON.stringify([]));
		}
	}
	// send updated stats with id for deleting
	sendStatus(id);
}

exports.getStatus = function () {
	return {users: clientNum, messages: messages.length};
}