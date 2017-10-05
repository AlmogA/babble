var messages = [];
var index = 0;
var clients = [];
var clientNum = 0;
var statusClients = [];
var util = require('util');
var md5 = require('md5');

exports.addMessage = function (message) {
	index++;
	message.id = index;
	if(message.email || message.email == "")
	    message.img = 'http://www.gravatar.com/avatar/' + md5(message.email) + '.jpg';
	messages.push(message);
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
	clients.push (response);
	//console.log(clients[0].socket.writable);
}

exports.removeExpired = function (response) {
	for(var i=0; i<clients.length;i++){
		if(clients[i]==response) {
			clients.splice(i, 1);
			return;
		}
	}
	for(var i=0; i<statusClients.length;i++){
		if(statusClients[i]==response) {
			statusClients.splice(i, 1);
			return;
		}
	}
}

exports.addClient = function() {
	clientNum++;
	sendStatus();
}

exports.removeClient = function() {
	clientNum--;
	sendStatus();
}
//setInterval(function(){ console.log("clients " + clients.length); }, 10000);

exports.pushStatusClient = function (response) {
	statusClients.push(response);
}

function sendStatus(id){
	while(statusClients.length > 0) {
		var client = statusClients.pop();
		if(client.socket && client.socket.writable) {
			// mybe here will be problem
			if(!id)
		    	client.end(JSON.stringify({users: clientNum, messages: messages.length}));
		    else 
		    	client.end(JSON.stringify({users: clientNum, messages: messages.length, deleteId: id}));
		}
	}
}

exports.needUpdate = function (data) {
	if(data.users != clientNum || data.messages != messages.length) {
		sendStatus();
	}
}

exports.deleteMessage = function (id) {
	/*********************************
	  VERY IMPORTEN: return error in case 
	   message already deleted 
	   ***********************/
	var flag=0;

	for(var i=0;i<messages.length;i++){
		if (messages[i].id == id){
			messages.splice(i,1);
			flag=1;
			break;
		}
	}
	if(flag==0)
		return;
	while(clients.length > 0) {
		var client = clients.pop();
		if(client.socket && client.socket.writable) {
			client.end(JSON.stringify([]));
		}
	}
	sendStatus(id);
}

exports.getStatus = function () {
	return {users: clientNum, messages: messages.length};
}