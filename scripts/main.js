"use strict";
if(!localStorage.getItem('babble')) {
    document.getElementById("myModal").style.display = "block";
    localStorage.setItem('babble', JSON.stringify({currentMessage:"", userInfo: {name:"", email:""}})); 
} else {
    // update Babble var and textarea with currentMessage
    setBabble();
    poll();
    statusPoll();
    login();
}

window.Babble = {currentMessage:"", userInfo: {name:"", email:""}};
Babble.counter = 0;
Babble.tabindex = 1; 

document.querySelector(".register").addEventListener('click', function(e) {
    e.preventDefault();
    Babble.register ({name: document.getElementById("id-name").value,
                      email: document.getElementById("id-email").value});
    poll();
    statusPoll();
    login();
});

document.querySelector(".anonymous").addEventListener('click', function(e) {
    e.preventDefault();
    Babble.register ({name: "", email:""});
    poll();
    statusPoll();
    login();
});

function setBabble() {
    var BabbleLocal = JSON.parse(localStorage.getItem('babble'));
    Babble.currentMessage = BabbleLocal.currentMessage;
    Babble.userInfo = BabbleLocal.userInfo;
    // expand textarea height if needed
    document.querySelector(".js-growable textarea").value = Babble.currentMessage;
    document.querySelector(".js-growable span").textContent = Babble.currentMessage;
}

// text area
makeGrowable(document.querySelector('.js-growable'));
function makeGrowable(container) {
    var area = container.querySelector('textarea');
    var clone = container.querySelector('span');
    area.addEventListener('input', function(e) {
        clone.textContent = area.value;
        // update localStorage current message
        Babble.currentMessage = area.value;
        localStorage.setItem('babble', JSON.stringify({currentMessage: Babble.currentMessage,
                                                       userInfo: Babble.userInfo})); 
    });
}

Babble.register = function (userInfo) {
    Babble.currentMessage = "";
    Babble.userInfo = userInfo;
    localStorage.setItem('babble', JSON.stringify({currentMessage: Babble.currentMessage,
                                                   userInfo: Babble.userInfo}));
    document.getElementById("myModal").style.display = "none";
}

function login() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:9000/login");
    xhr.send(); 
}

window.addEventListener("unload", function() {
    navigator.sendBeacon("http://localhost:9000/logout");
}, false); 

Babble.postMessage = function (message, callback) {
    /*
    request({
        method: "POST",
        action: "http://localhost:9000/messages",
        data: message
    }).then(function(result) {
        callback(JSON.parse(result));
    }); */
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:9000/messages");
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.addEventListener('load', function(e) {
         callback(JSON.parse(e.target.responseText));
    });
    xhr.send(JSON.stringify(message));
}

function emptyTextarea () {
    document.querySelector(".js-growable textarea").value = "";
    document.querySelector(".js-growable span").textContent = "";
    Babble.currentMessage = "";
    localStorage.setItem('babble', JSON.stringify({currentMessage: Babble.currentMessage,
                                                    userInfo: Babble.userInfo})); 
}

document.getElementById("messageForm").addEventListener('submit', function(e) {
    e.preventDefault();
    var data = {
        name: Babble.userInfo.name,
        email: Babble.userInfo.email,
        message: document.querySelector("textarea").value,
        timestamp: Date.now()
    };
    Babble.postMessage(data, emptyTextarea);
});

document.getElementById("messageForm").addEventListener("keyup", function(event) {
    event.preventDefault();
    if (event.keyCode == 13) {
        document.querySelector(".sendButton").click();
    }
});

function request(props) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(props.method, props.action);
        if (props.method === 'post') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xhr.addEventListener('load', function(e) {
            resolve(e.target.responseText);
        });
        xhr.send(JSON.stringify(props.data));
    });
}

function poll() {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function (e) {
        e.preventDefault();
        if(e.target.responseText) {
            var responseObject = JSON.parse(e.target.responseText);
            if(responseObject.length>0){
            displayMessages(responseObject);
            Babble.counter+= responseObject.length;
            document.querySelector("dd:nth-child(3)").innerHTML = (+document.querySelector("dd:nth-child(3)").innerHTML) + (+responseObject.length);
            }
            else
                Babble.counter-= 1;
        }
        clearTimeout(Babble.lastTimeout);
        poll();
    });
    xhr.open("GET", "http://localhost:9000/messages?counter="+Babble.counter);
    Babble.lastTimeout = setTimeout(function(){xhr.abort(); poll();}, 240000);
    xhr.send(); 
}

function displayMessages(messages) {
    var message;
    var append;
    for (var i = 0; i < messages.length; i++) {
        message = messages[i];
        append = "";
        append += '<li id="' + message.id + '"> ';
        append += '<img src="' + message.img + '"> ';
        append += '<div class="message" tabindex=' + Babble.tabindex + ' > ';
        Babble.tabindex++;
        if (message.name == Babble.userInfo.name && message.email == Babble.userInfo.email 
            && message.name!="" && message.email!=""){
            append += '<button class="deleteButton visually-hidden" onclick="deleteM(this)" tabindex=' + Babble.tabindex +' ></button> ';
        Babble.tabindex++;
        }
        if(message.name == "")
            message.name = "Anonymous";
        append += '<cite>' + message.name + '</cite> ';
        var date = new Date(message.timestamp);
        append += '<time>' + date.getHours() + ':' + ("0" + date.getMinutes()).substr(-2) + '</time> ';
        append += '<div class="messageContent">' + message.message + '</div>';
        append += '</div> ';
        append += '</li> ';
        document.querySelector('ol').innerHTML += append;
        document.querySelector('ol').scrollTo(0, document.querySelector('ol').scrollHeight);
    }
}



Babble.users = 0;
Babble.messages = 0;
function statusPoll() {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function (e) {
        e.preventDefault();
        if(e.target.responseText) {
            var responseObject = JSON.parse(e.target.responseText);
            Babble.users = responseObject.users;
            Babble.messages = responseObject.messages;
            document.querySelector("dd:nth-child(3)").innerHTML = Babble.messages;
            document.querySelector("dd:last-child").innerHTML =  Babble.users;
            if(responseObject.deleteId){
                var el = document.getElementById(responseObject.deleteId);
                if(el)
                    el.parentNode.removeChild( el );
            }
        }
        clearTimeout(Babble.lastTimeoutStatus);
        statusPoll();
    });
    xhr.open("GET", "http://localhost:9000/pollStatus?users="+Babble.users+"&messages="+Babble.messages);
    Babble.lastTimeoutStatus = setTimeout(function(){xhr.abort(); statusPoll();}, 240000);
    xhr.send(); 
}

Babble.deleteMessage = function(id, callback) {
    /*
    request({
        method: "DELETE",
        action: "http://localhost:9000/messages/"+id,
        data: {}
    }).then(function(result) {
        var el = document.getElementById(id);
        if(el)
            el.parentNode.removeChild( el );
        callback(result);
    }); */
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", "http://localhost:9000/messages/"+id);
    xhr.addEventListener('load', function(e) {
        var el = document.getElementById(id);
        if(el)
            el.parentNode.removeChild( el );
        if(e.target.responseText == "true")
           callback(true);
    });
    xhr.send(JSON.stringify({}));
}

function a(result){
}

function deleteM(message){
    Babble.deleteMessage(message.parentNode.parentNode.id, a);

}

Babble.getMessages = function(counter, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://localhost:9000/messages?counter=" + counter);
    xhr.addEventListener('load', function(e) {
           callback(JSON.parse(e.target.responseText));
    });
    xhr.send(JSON.stringify({}));
}

Babble.getStats = function (callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://localhost:9000/stats");
    xhr.addEventListener('load', function(e) {
           callback(JSON.parse(e.target.responseText));
    });
    xhr.send(JSON.stringify({}));
}

/*
function focusMessage(button){
    button.parentElement.style.backgroundColor = "#ebedec";
}

function unfocusMessage(button){
    button.parentElement.style.backgroundColor = "white";
}
*/
//document.querySelector(".message").focus();

