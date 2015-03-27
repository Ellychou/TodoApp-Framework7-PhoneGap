// Initialize your app
var myApp = new Framework7({
    modalTitle: 'TODO App',
    animateNavBackIcon: true
});

$.ajaxSetup({
    headers : { 'Authorization' : $.jStorage.get("token") },
    type: "POST",
    contentType: "application/json; charset=utf-8",
    dataType: "json"
});

// Export selectors engine
var $$ = Framework7.$;

var serverURI = "http://codeashobby.com:8080/";

// Add views
var view1 = myApp.addView('#view-1');
var view2 = myApp.addView('#view-2', {
    // Because we use fixed-through navbar we can enable dynamic navbar
    dynamicNavbar: true
});
var view3 = myApp.addView('#view-3');
var view4 = myApp.addView('#view-4');

// Add main view
var mainView = myApp.addView('.view-main', {
    // Enable Dynamic Navbar for this view
    dynamicNavbar: true
});
// Add another view, which is in right panel
var rightView = myApp.addView('.view-right', {
    // Enable Dynamic Navbar for this view
    dynamicNavbar: true
});
// Show/hide preloader for remote ajax loaded pages
// Probably should be removed on a production/local app
$$(document).on('ajaxStart', function () {
    //myApp.showIndicator();
});
$$(document).on('ajaxComplete', function () {
    //myApp.hideIndicator();
});

if ($.jStorage.get("email")) {
    $$('#user-email-span').text($.jStorage.get("email"));
    $$('#date-picker').val(getCurrentDate());
    getTODOList();
    getHistoryList();
} else {
    mainView.loadPage('login.html');
}

// Events for specific pages when it initialized
$$(document).on('pageInit', function (e) {
    var page = e.detail.page;

    if (page.name === 'login') {
        $$('.toolbar').hide();
        $$('.loginBtn').on('click', function () {
            var email = $('#email').val();
            if (!validateEmail(email)) {
                myApp.alert('Not a valid e-mail address.');
                $('#email').val("");
                $('#password').val("");
                return;
            }
            var password = $('#password').val();
            myApp.login(email, password);
        });
    }

    if (page.name === 'signup') {
        $$('.toolbar').hide();
        $$('.signupBtn').on('click', function () {
            var email = $('#signup-email').val();
            var username = $('#signup-username').val();
            var password = $('#signup-password').val();
            var password_cfm = $('#signup-password-cfm').val();
            console.log(email, username, password, password_cfm);
            if (myApp.signupCheck(email, username, password, password_cfm)) {
                myApp.signup(email, username, password);
            }

        });
    }
});

// Pull to refresh content
var ptrContent = $$('.todo-refresh');
// Add 'refresh' listener on it
ptrContent.on('refresh', function (e) {
    getTODOList();
    // When loading done, we need to "close" it
    myApp.pullToRefreshDone();
});


$$('#logoutBtn').on('click', function () {
    myApp.logout();
});

$$('.submitBtn').on('click', function () {
    var task = $('#task-name').val();
    var date = $('#date-picker').val();
    var time = $('#time-picker').val();
    var datetime = genCurrentDatetime(date, time);
    myApp.addNewTask(task, datetime);
   // console.log("---");
});

$$('.pre-loader').on('click', function () {
    myApp.showPreloader();
})
// Required for demo popover
$$('.popover a').on('click', function () {
    myApp.closeModal('.popover');
});

// Change statusbar bg when panel opened/closed
$$('.panel-left').on('open', function () {
    $$('.statusbar-overlay').addClass('with-panel-left');
});
$$('.panel-right').on('open', function () {
    $$('.statusbar-overlay').addClass('with-panel-right');
});
$$('.panel-left, .panel-right').on('close', function () {
    $$('.statusbar-overlay').removeClass('with-panel-left with-panel-right');
});

myApp.signup = function (email, username, password) {
    $.ajax({
        url: serverURI + "user/signup",
        type: "POST",
        data: JSON.stringify({
            email :email,
            password: password,
            userName: username
        }),
        success : function(data) {
            console.log("how ");
             $.jStorage.set("token", data.token);
             $.jStorage.set("email", email);
             $.jStorage.set("password", password);
             $.jStorage.set("username", username);
             document.location = 'index.html';
        },
        error : function(data) {
             myApp.alert('Sign up failed!'); 
             mainView.loadPage('signup.html');
         }
    })
}

myApp.login = function (email, password) {

    $.ajax({
        url: serverURI + "user/login",
        type: "POST",
        data: JSON.stringify({
            email: email,
            password: password
        }),
        success : function(data) {
            console.log("hi");
             console.log(data.token);
             $.jStorage.set("token", data.token);
             $.jStorage.set("email", email);
             $.jStorage.set("password", password);
            document.location = 'index.html';
            //alert("success");
        },
        error : function(jqXHR, textStatus, errorThrown) {
            myApp.alert('cannot find the user');
            $.jStorage.deleteKey("email");
            $.jStorage.deleteKey("password");
            $('#email').val("");
            $('#password').val("");
            //alert("error");
        }

    })
}

myApp.logout = function () {
    $.ajax({type: 'POST', url: serverURI + "user/logout", async: false});
    $.jStorage.deleteKey("email");
    $.jStorage.deleteKey("password");
    document.location = 'index.html';
}

myApp.addNewTask = function (taskName, time) {
    $.ajax({
        url: serverURI + "event/createNewEvent",
        data: JSON.stringify({
            title: taskName,
            doneTime: time
        }),
        success : function(data) {
           myApp.alert( data.message);
        },
        error : function(data) { 
            myApp.alert(data.message);    
         }
    });
}
           
        



function getTODOList() {
    $('.todo-refresh ul').empty();
    $.getJSON(serverURI + 'event/todoList').done(function (data) {
            var ptrContent = $$('.todo-refresh');
            $.each(data, function () {
                 var time = TimestampToDate(this.doneTime); 
                console.log(time);
                var linkHTML = '<li event-id="' + this.eventId + '">' +
                    '<label class="label-checkbox item-content">' +
                    '<input type="checkbox" onchange="setDone(this)" name="ks-checkbox" value="' + this.title + '"/>' +
                    '<div class="item-media"><i class="icon icon-form-checkbox"></i></div>' +
                    '<div class="item-inner">' +
                    '<div class="item-title">' + this.title + ' (' + time + ')</div>' +
                    '</div>' +
                    '</label>' +
                    '</li>';
                ptrContent.find('ul').prepend(linkHTML);
            });
    });
       
}
function getHistoryList() {
    $('.history-refresh ul').empty();
    $.getJSON(serverURI + 'event/completeList').done(function (data) {
            var ptrContent = $$('.history-refresh');
            $.each(data, function () {
                 var time = TimestampToDate(this.doneTime); 
                console.log(time);
                var linkHTML = '<li event-id="' + this.eventId + '">' +
                    '<label class="label-checkbox item-content">' +
                    '<input type="checkbox" checked onchange="setUnDone(this)" name="ks-checkbox" value="' + this.title + '"/>' +
                    '<div class="item-media"><i class="icon icon-form-checkbox"></i></div>' +
                    '<div class="item-inner">' +
                    '<div class="item-title">' + this.title + ' (' + time + ')</div>' +
                    '</div>' +
                    '</label>' +
                    '</li>';
                ptrContent.find('ul').prepend(linkHTML);
            });
        

    });
}

myApp.signupCheck = function (email, username, password, password_cfm) {
    // check email format first
    if (!validateEmail(email)) {
        myApp.alert('Not a valid e-mail address.');
        return false;
    }

    // check password length
    if (password.length < 6) {
        myApp.alert('The length of password should be longer than 6.');
        return false;
    }

    // check password_cfm
    if (password != password_cfm) {
        myApp.alert('The password is not confirmed.');
        return false;
    }

    return true;

}

function validateEmail(email) {
    var re = /^\s*[\w\-\+_]+(\.[\w\-\+_]+)*\@[\w\-\+_]+\.[\w\-\+_]+(\.[\w\-\+_]+)*\s*$/;
    if (re.test(email)) {
        return true;
    } else {
        return false;
    }
}

function getCurrentDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();

    if (dd < 10) {
        dd = '0' + dd
    }

    if (mm < 10) {
        mm = '0' + mm
    }
    today = yyyy + "-" + mm + '-' + dd;
    return today;
}

function genCurrentDatetime(date, time) {
    return date + 'T' +  time;
}

function TimestampToDate(timestamp) {
 var d = new Date(timestamp),	// Convert the passed timestamp to milliseconds
		yyyy = d.getFullYear(),
		mm = ('0' + (d.getMonth() + 1)).slice(-2),	// Months are zero based. Add leading 0.
		dd = ('0' + d.getDate()).slice(-2),			// Add leading 0.
		hh = d.getHours(),
		h = hh,
		min = ('0' + d.getMinutes()).slice(-2),		// Add leading 0.
		ampm = 'AM',
		time;
			
	if (hh > 12) {
		h = hh - 12;
		ampm = 'PM';
	} else if (hh === 12) {
		h = 12;
		ampm = 'PM';
	} else if (hh == 0) {
		h = 12;
	}
	
	// ie: 2013-02-18, 8:35 AM	
	time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
		
	return time;
}

function setDone(obj) {
    if (obj.checked) {
        var parent = $(obj).parent().parent();
        var eventId = parent.attr("event-id");
        
    $.ajax({
        url: serverURI + "event/setDone",
        type: "POST",
        data: JSON.stringify({
           eventId: eventId
        }),
        success : function(data) {
         
            document.location = 'index.html';
        },
        error : function(data) {
             
             myApp.alert('Set the event done failed!'); 
            
         }
    })
    }
}

function setUnDone(obj) {
    //if (obj.unchecked) {
        var parent = $(obj).parent().parent();
        var eventId = parent.attr("event-id");
        
    $.ajax({
        url: serverURI + "event/setUndone",
        type: "POST",
        data: JSON.stringify({
           eventId: eventId
        }),
        success : function(data) {
         getHistoryList();
        },
        error : function(data) {
            
             myApp.alert('Set the event to do failed!'); 
            
         }
    })

}

function deleteTask(obj) {
    var parent = $(obj).parent().parent();
    var eventId = parent.attr("event-id");
    
    $.ajax({
        url :serverURI + "event/deleteTask",
        type: "delete",
        data: JSON.stringify({
            eventId :eventId
        }),
        success : function(data) {
            myApp.alert(data.message); 
        },
        error : function(data) {
             myApp.alert(data.message); 
         }
        
    })
    
}


