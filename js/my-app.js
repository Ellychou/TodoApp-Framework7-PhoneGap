// Initialize your app
var myApp = new Framework7({
  modalTitle: 'TODO App',
  animateNavBackIcon: true
});

$.ajaxSetup({
  data: {
    "token": $.jStorage.get("token"),
    "email": $.jStorage.get("email")
  },
  type: "POST"
});

// Export selectors engine
var $$ = Framework7.$;

var serverURI = "http://192.168.1.135/"

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

if($.jStorage.get("email")){
  $$('#user-email-span').text($.jStorage.get("email"));
  $$('#date-picker').val(getCurrentDate());
  getTODOList();
  getHistoryList();
} else {
  mainView.loadPage('login.html');
}

// Events for specific pages when it loaded and initialized
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
  console.log("---");
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
  $.post(serverURI + "user/signup", {
    email: email,
    userName: username,
    password: password
  }, function (result) {
    console.log(result);
    if (result.status == 201) {
      // store email and password to local storage
      $.jStorage.set("email", email);
      $.jStorage.set("username", username);
      $.jStorage.set("password", password);
      document.location = 'index.html';
    } else {
      myApp.alert('Sign up failed!');
      mainView.loadPage('signup.html');
    }

  });
}

myApp.login = function (email, password) {
  $.post(serverURI + "user/login", {
    email: email,
    password: password
  }, function (result) {
    console.log(result);
    if (result.status == 201) {
      $.jStorage.set("token", result.token);
      // store email and password to local storage
      $.jStorage.set("email", email);
      $.jStorage.set("password", password);
      document.location = 'index.html';
    } else {
      myApp.alert('cannot find the user');
      $.jStorage.deleteKey("email");
      $.jStorage.deleteKey("password");
      $('#email').val("");
      $('#password').val("");
      return;
    }

  });
}

myApp.logout = function () {
  $.ajax({type: 'POST', url: serverURI + "user/logout", async:false });
  /*
  $.post(serverURI + "logout", function (result) {
    // do nothing here now
  });
  */

  $.jStorage.deleteKey("email");
  $.jStorage.deleteKey("password");
  //mainView.loadPage('login.html');
  document.location = 'index.html';
}

myApp.addNewTask = function (taskName, time) {
  $.post(serverURI + "event/createNewEvent", {
    title: taskName,
    doneTime: time
  }, function (data) {

    var statusCode = data.status;
    if (statusCode == 201) {

      document.location = 'index.html';

    } else if (statusCode == 401) { // unlogin
      var email = $.jStorage.get("email");
      var password = $.jStorage.get("password");
      if (email && password) {
        // auto login with local storage data
        myApp.login(email, password);
        //TODO: should continue current getJson request, but I won't make it now
      } else {
        // redirect to login page
        mainView.loadPage('login.html');
      }
    } else {
      myApp.alert("Add new task failed");
    }

  });
}

function getTODOList() {
  $('.todo-refresh ul').empty();
  $.getJSON(serverURI + 'event/todoList').done(function (data) {
    var statusCode = data.status;
    if (statusCode == 200) {
      var ptrContent = $$('.todo-refresh');
      $.each(data, function () {
        var linkHTML = '<li event-id="'+this.eventId+'">' +
          '<label class="label-checkbox item-content">' +
          '<input type="checkbox" onchange="setDone(this)" name="ks-checkbox" value="'+this.title+'"/>' +
          '<div class="item-media"><i class="icon icon-form-checkbox"></i></div>' +
          '<div class="item-inner">' +
          '<div class="item-title">'+this.title+' ('+this.startTime+')</div>' +
          '</div>' +
          '</label>' +
          '</li>';
        ptrContent.find('ul').prepend(linkHTML);
      });
    } else if (statusCode == 401) { // unlogin
      var email = $.jStorage.get("email");
      var password = $.jStorage.get("password");
      if (email && password) {
        // auto login with local storage data
        myApp.login(email, password);
        //TODO: should continue current getJson request, but I won't make it now
      } else {
        // redirect to login page
        mainView.loadPage('login.html');
      }
    } else {
      myApp.alert("Request faild!");
    }

  });
}
function getHistoryList() {
  $('.history-refresh ul').empty();
  $.getJSON(serverURI + 'event/completeList').done(function (data) {
    var statusCode = data.status;
    if (statusCode == 200) {
      var ptrContent = $$('.history-refresh');
      $.each(data, function () {
        var linkHTML = '<li event-id="'+this.eventId+'">' +
          '<label class="label-checkbox item-content">' +
          '<input type="checkbox" checked name="ks-checkbox" value="'+this.title+'"/>' +
          '<div class="item-media"><i class="icon icon-form-checkbox"></i></div>' +
          '<div class="item-inner">' +
          '<div class="item-title">'+this.title+' ('+this.startTime+')</div>' +
          '</div>' +
          '</label>' +
          '</li>';
          
        ptrContent.find('ul').prepend(linkHTML);
      });
    } else if (statusCode == 401) { // unlogin
      var email = $.jStorage.get("email");
      var password = $.jStorage.get("password");
      if (email && password) {
        // auto login with local storage data
        myApp.login(email, password);
        //TODO: should continue current getJson request, but I won't make it now
      } else {
        // redirect to login page
        mainView.loadPage('login.html');
      }
    } else {
      myApp.alert("Request faild!");
    }

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
  return date + " " + time;
}

function displayTODOList(jsonData) {
  console.log(jsonData);
  $('.todo-refresh ul').empty();
  var ptrContent = $$('.todo-refresh');
  $.each(jsonData, function () {
    var linkHTML = '<li class="todo-refresh-li" event-id="'+this.id+'">' +
      '<label class="label-checkbox item-content">' +
      '<input type="checkbox" name="ks-checkbox" value="'+this.title+'"/>' +
      '<div class="item-media"><i class="icon icon-form-checkbox"></i></div>' +
      '<div class="item-inner">' +
      '<div class="item-title">'+this.title+' ('+this.start+')</div>' +
      '</div>' +
      '</label>' +
      '</li>';
    ptrContent.find('ul').prepend(linkHTML);
  });
}

function setDone(obj){
  if(obj.checked) {
    var parent = $(obj).parent().parent();
    var eventId = parent.attr("event-id");

    $.post(serverURI + "event/setDone", {
        eventId: eventId
      }, function (result) {
        if (result.status == 200) {
          document.location = 'index.html';
        } else {
          //myApp.alert('Sign up failed!');
          //mainView.loadPage('signup.html');
        }

      });
  } else {
    //myApp.alert("not checked");
  }

}
