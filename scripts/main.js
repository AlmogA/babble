"use strict";

window.Babble = {currentMessage:"", userInfo: {name:"", email:""}};
// used for long polling
Babble.counter = 0;

// if user need to log-in
if(!localStorage.getItem('babble')) {
    // store empty details in local storage
    localStorage.setItem('babble', JSON.stringify({currentMessage:"", userInfo: {name:"", email:""}})); 
    Babble.registered = "0";  // indicate if we logged in or not
} else {
    document.getElementById("myModal").style.display = "none"; // if user info exist hide modal
    setBabble(); // update Babble var and textarea with currentMessage
    connectServer(); // start long pollings
}

// update user info from the local sotrage
function setBabble() {
    var BabbleLocal = JSON.parse(localStorage.getItem('babble'));
    Babble.currentMessage = BabbleLocal.currentMessage;
    Babble.userInfo = BabbleLocal.userInfo;
    // expand textarea height if needed
    document.querySelector(".js-growable textarea").value = Babble.currentMessage;
    document.querySelector(".js-growable span").textContent = Babble.currentMessage;
}

// first connection to the server
function connectServer() {
    poll(); // poll for messages
    statusPoll(); // poll for status and deleted messages
    login(); // tell the server to update connected user counter
}

// update local storage and hide modal
Babble.register = function (userInfo) {
    Babble.currentMessage = "";
    Babble.userInfo = userInfo;
    localStorage.setItem('babble', JSON.stringify({currentMessage: Babble.currentMessage,
                                                   userInfo: Babble.userInfo}));
    document.getElementById("myModal").style.display = "none";
}

Babble.getMessages = function(counter, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://localhost:9000/messages?counter=" + counter);
    xhr.addEventListener('load', function(e) {
           callback(JSON.parse(e.target.responseText));
    });
    xhr.send(JSON.stringify({}));
}

Babble.postMessage = function (message, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:9000/messages");
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.addEventListener('load', function(e) {
         callback(JSON.parse(e.target.responseText));
    });
    xhr.send(JSON.stringify(message));
}

Babble.deleteMessage = function(id, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", "http://localhost:9000/messages/"+id);
    xhr.addEventListener('load', function(e) {
        // remove the message from the DOM
        var el = document.getElementById(id);
        if(el)
            el.parentNode.removeChild(el);
        if(e.target.responseText == "true" && callback)
           callback(true);
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

// tell the server that new client arrived
function login() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:9000/login");
    xhr.send(); 
}

// when closing the widnodw (not always works in firefox)
window.addEventListener("unload", function() {
    // if the user never logged in we just remove the empty item in local storage
    if(Babble.registered && Babble.registered == 0){
       localStorage.removeItem('babble');
    }
    // tell the server that client is leaving
    else
        navigator.sendBeacon("http://localhost:9000/logout");
}, false); 

// if user click "save" on modal
document.querySelector(".register").addEventListener('click', function(e) {
    e.preventDefault();
    Babble.registered = "1";
    // update user info in local storage
    Babble.register ({name: document.getElementById("id-name").value,
                      email: document.getElementById("id-email").value});
    connectServer(); // start long pollings
});

// if user choose to be anonymous
document.querySelector(".anonymous").addEventListener('click', function(e) {
    e.preventDefault();
    Babble.registered = "1";
    Babble.register ({name: "", email:""}); // update user info in local storage
    connectServer(); // start long pollings
});

// text area growable
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

// empty text area after message sent, and update local storage with empty currentMessage
function emptyTextarea () {
    document.querySelector(".js-growable textarea").value = "";
    document.querySelector(".js-growable span").textContent = "";
    Babble.currentMessage = "";
    localStorage.setItem('babble', JSON.stringify({currentMessage: Babble.currentMessage,
                                                    userInfo: Babble.userInfo})); 
}

// when submitting new message
document.getElementById("messageForm").addEventListener('submit', function(e) {
     e.preventDefault();
    // if message is empty do nothing
    if(!document.querySelector("textarea").value.replace(/\s/g, '').length){
        document.querySelector("textarea").value = "";
        document.querySelector(".js-growable span").textContent = "";
        return;
    }
    var data = {
        name: Babble.userInfo.name,
        email: Babble.userInfo.email,
        message: document.querySelector("textarea").value,
        timestamp: Date.now()
    };
    Babble.postMessage(data, emptyTextarea);
});

// if user click 'enter' submit the form
document.getElementById("messageForm").addEventListener("keyup", function(event) {
    event.preventDefault();
    if (event.keyCode == 13) {
        document.querySelector(".sendButton").click();
    }
});

// long polling for new messages
function poll() {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function (e) {
        e.preventDefault();
        if(e.target.responseText) {
            var responseObject = JSON.parse(e.target.responseText);
            // if new messages arrived
            if(responseObject.length > 0){
                displayMessages(responseObject);
                Babble.counter+= responseObject.length;
                // update number of messages in the status
                document.querySelector("dd:nth-child(3)").innerHTML = 
                    (+document.querySelector("dd:nth-child(3)").innerHTML) + (+responseObject.length);
            }
            else
                Babble.counter-= 1;
        }
        clearTimeout(Babble.lastTimeout);
        poll();
    });
    xhr.open("GET", "http://localhost:9000/messages?counter="+Babble.counter);
    // every 4 minutes the request dropping, and we send new request
    Babble.lastTimeout = setTimeout(function(){xhr.abort(); poll();}, 600000);
    xhr.send(); 
}

Babble.users = 0;
Babble.messages = 0;
// long polling for status and message deleting
function statusPoll() {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function (e) {
        e.preventDefault();
        if(e.target.responseText) {
            var responseObject = JSON.parse(e.target.responseText);
            Babble.users = responseObject.users;
            Babble.messages = responseObject.messages;
            // update status list with new data
            document.querySelector("dd:nth-child(3)").innerHTML = Babble.messages;
            document.querySelector("dd:last-child").innerHTML =  Babble.users;
            // if message was deleted, delete it 
            if(responseObject.deleteId){
                var el = document.getElementById(responseObject.deleteId);
                if(el)
                    el.parentNode.removeChild(el);
            }
        }
        clearTimeout(Babble.lastTimeoutStatus);
        statusPoll();
    });
    xhr.open("GET", "http://localhost:9000/pollStatus?users="+Babble.users+"&messages="+Babble.messages);
    // new request every 4 minutes
    Babble.lastTimeoutStatus = setTimeout(function(){xhr.abort(); statusPoll();}, 600000);
    xhr.send(); 
}

// display messages in ol
function displayMessages(messages) {
    var message;
    var append;
    for (var i = 0; i < messages.length; i++) {
        message = messages[i];
        append = "";
        append += '<li id="' + message.id + '"> ';
        append += '<img src="' + message.img + '" alt="'+ message.name + ' profile photo"> ';
        append += '<div class="message" tabindex=0 > ';
        // if user hava same mail and username as the message, he can delete it
        if (message.name == Babble.userInfo.name && message.email == Babble.userInfo.email 
            && message.name!="" && message.email!=""){
            append += '<button class="deleteButton visually-hidden" onclick="Babble.deleteMessage(this.parentNode.parentNode.id)" onfocus="focusMessage(this)" onblur="unfocusMessage(this)" aria-label="delete message"></button> ';
        }
        if(message.name == "")
            message.name = "Anonymous";
        append += '<cite>' + message.name + '</cite> ';
        var date = new Date(message.timestamp);
        append += '<time>' + date.getHours() + ':' + ("0" + date.getMinutes()).substr(-2) + '</time> ';
        // escapeHtml replace special characters in html
        append += '<div class="messageContent">' + escapeHtml(message.message) + '</div>';
        append += '</div> ';
        append += '</li> ';
        document.querySelector('ol').innerHTML += append;
        // scroll down
        document.querySelector('ol').scrollTo(0, document.querySelector('ol').scrollHeight);
    }
    // shrink warp the messages to the max width
    shrinkWrap(messages.length);
}

// escapeHtml replace special characters in html
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function focusMessage(button){
    button.parentElement.classList.add("u-greyBackground");
}

function unfocusMessage(button){
   button.parentElement.classList.remove("u-greyBackground");
}

/* used for wrapping the text correctly.
   in the function I add words to span element until the max width reached,
   and eventily change the width to the max line width
*/
function shrinkWrap (index) {
    if(!document.querySelector(".message"))
        return;
    // get max width of message (on big screen - 600px)
    var maxWidth = window.getComputedStyle( document.querySelector(".message") ,null).getPropertyValue('max-width');
    maxWidth = Number(maxWidth.substring(0, maxWidth.indexOf("p")));
    if(!maxWidth) {
        maxWidth = (Number(document.querySelector("ol").offsetWidth)*92.0/100.0) - 60.0;
    }
    var minWidth = window.getComputedStyle( document.querySelector(".message") ,null).getPropertyValue('min-width');
    minWidth = Number(minWidth.substring(0, minWidth.indexOf("p")));

    var d = document.querySelectorAll('.messageContent'),
    i, w=0, width, height, text="";

    if(isNaN(index)){
        index = d.length;
    }

    var a = document.getElementById("word");
    var b = document.getElementById("text");

    var lineWidth = 0;
    for(i = (d.length - index) ; i < d.length ; i++) {
        d[i].style.width = "auto";
        var array = d[i].innerHTML.split(' ');
        text = "";
        b.innerHTML = text;
        lineWidth = 0;
        w=0;
        for (var j=0;j<array.length;j++) {
            a.innerHTML = array[j] +".";
            if(a.offsetWidth >= maxWidth){
                w=maxWidth;
                break;
            }
            if(lineWidth + a.offsetWidth > maxWidth) {
                text = text.substring(0,text.length - 1);
                text+= ".</br>"+array[j] + ".";
                a.innerHTML = array[j] + ".";
                lineWidth =  a.offsetWidth;
            }
            else {
                a.innerHTML = a.innerHTML.substring(0,a.innerHTML.length - 1);
                text+= a.innerHTML + ".";
                a.innerHTML = a.innerHTML +".";
                lineWidth+= a.offsetWidth;   
            }
            b.innerHTML = text;
        }
        if(w!=maxWidth)
            w=b.offsetWidth;  
        d[i].style.width= (w)+'px';  
    }
}

window.onresize = shrinkWrap;
