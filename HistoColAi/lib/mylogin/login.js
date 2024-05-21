/*
13 Octobre 2014: added check for already logged user
*/

var	root="lib/mylogin/";
var MyLoginWidget = {
	username:"",
	loggedin:0,
	subscribers:new Array(),
	init: function() {
		var	me=this;
		var def=$.Deferred();

		$.get(root+"login.html", function(html) {
			$.get(root+"login.php",{"action":"check"},function(data){
				try {
					var msg=JSON.parse(data);
				} catch(e) {
					$("div#login").html(html);
					me.displayLoginLink();
					return;
				}

				if(msg.response=="Yes")
				{
					$("div#login").html(html);
					me.username=msg.username;
					me.loggedin=1;
					me.displayLoggedinLink();
				}
				else
				{
					$("div#login").html(html);
					me.displayLoginLink();
					me.displayLoginForm();
				}
				if(me.subscribers[0])
					me.subscribers[0](); 

				def.resolve();
			});
		});

		return def.promise();
	},
	displayLoginLink: function() {
		$("div#login >").addClass("hidden");
		$("div#login a#loginLink").removeClass("hidden");
		$("div#login #warning").removeClass("hidden");
	},
	displayLoginForm: function() {
		$("div#login >").addClass("hidden");
		$("div#login #username").attr("placeholder","Name");
		$("div#login > #pleaseLogIn, #username, #password, #sendLogin, #registerLink, #remind,#warning").removeClass("hidden");
		$("div#login").addClass("loginbox");
	},
	displayLogoutForm: function() {
		$("div#login >").addClass("hidden");
		$("div#login > #warning").removeClass("hidden");
		$("div#login").addClass("loginbox");
	},
	displayLoggedinLink: function() {
		$("div#login >").addClass("hidden");
		$("div#login span#loggedinLink").removeClass("hidden");
		$("div#login #warning").removeClass("hidden");
		$("div#login a#user").html(this.username);
		$("div#login a#user").attr("href","/user/"+this.username);
	},
	displayRegisterForm: function() {
		$("div#login >").addClass("hidden");
		$("div#login #username").attr("placeholder","Name");
		$("div#login > #pleaseLogIn, #username, #e-mail, #password, #repassword, #cancel, #register,#warning").removeClass("hidden");
	},
	sendLogin: function() {
		var	me=this;
		$.get(root+"login.php",{"action":"login","username":$("#username").val(),"password":$("#password").val()},function(data){
			try {
				var msg=JSON.parse(data);
			} catch(e) {
				console.log("Error: cannot parse logout response json",data);
				return;
			}

			if(msg.response=="Yes")
			{
				me.username=$("#username").val();
				me.loggedin=1;
				me.displayLoggedinLink();
				$("div#login #warning").html("Welcome " + me.username).fadeIn();
				setTimeout(function() {
					$("div#login #warning").fadeOut(500,function() {
						$("div#login").removeClass("loginbox");
					});
				},2000);
				if(me.subscribers[0])
					me.subscribers[0](); 
			}
			else
			{
				me.loggedin=0;
				$("div#login #warning").html("Incorrect, try it again.").fadeIn();
				setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			}
		});
		$("#password").val("");
	},
	cancel: function() {
		this.displayLoginLink();
		$("div#login").removeClass("loginbox");
	},
	logout: function() {
		var me=this;
		$.get(root+"login.php",{"action":"logout"},function(data){
			try {
				var msg=JSON.parse(data);
			} catch(e) {
				console.log("Error: cannot parse logout response json",data);
				return;
			}

			if(msg.response=="Yes")
			{
				me.username="";
				me.loggedin=0;
				me.displayLoginLink();
				me.displayLogoutForm();
				$("div#login #warning").html("Loging out...").fadeIn();
				setTimeout(function(){
					$("div#login #warning").fadeOut()
					location.reload();
				}, 2000);
				if(me.subscribers[0])
					me.subscribers[0](); 
			}
			else
			{
				$("div#login #warning").html("Error login out, Try it again").fadeIn();
				setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			}
		});
	},
	sendRegister: function () {
		var	me=this;
		var	reg_username=$("div#login #username").val();
		var	reg_email=$("div#login #e-mail").val();
		var	reg_password=$("div#login #password").val();
		var	reg_repassword=$("div#login #repassword").val();

		if(reg_username=="" || reg_email=="" || reg_password=="" || reg_repassword=="")
		{
			$("div#login #warning").html("Fill up all the gaps").fadeIn();
			setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			return;
		}

		if(reg_password!=reg_repassword)
		{
			$("div#login #warning").html("The passwords dont match").fadeIn();
			setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			return;
		}

		$.get(root+"login.php",{"action":"register","username":reg_username,"email":reg_email,"password":reg_password},function(data){
			try {
				var msg=JSON.parse(data);
			} catch(e) {
				console.log("Error: cannot parse register response json",data);
				return;
			}

			if(msg.response=="Yes")
			{
				me.username=reg_username;
				me.loggedin=1;
				me.displayLoggedinLink();
				$("div#login #warning").html("Registration process succed").fadeIn();
				if(me.subscribers[0])
					me.subscribers[0](); 
				setTimeout(function() {
					$("div#login #warning").fadeOut(500,function() {
						$("div#login").removeClass("loginbox");
					});
				},2000);
			}
			else
			if(msg.response=="Exists")
			{
				$("div#login #warning").html("The user is currently in use, please use another.").fadeIn();
				setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			}
			else
			{
				$("div#login #warning").html("Registration process failed, please try it again later.").fadeIn();
				setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			}
		});
		$("#password").val("");
		$("#repassword").val("");
	},
	remind: function () {
		var	me=this;
		var	reg_username=$("div#login #username").val();

		if(!reg_username) 
		{
			$("div#login #warning").html("Introduce user name or email").fadeIn();
			setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			return;
		}
		$.get(root+"login.php",{"action":"remind","email+name":reg_username},function(data){
			try {
				var msg=JSON.parse(data);
			} catch(e) {
				console.log("Error: cannot parse remind response json",data);
				return;
			}

			if(msg.response=="Yes")
			{
				$("div#login #warning").html("You will recive a new password to the email introduced").fadeIn();
				setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			}
			else
			if(msg.response=="Unavailable")
			{
				$("div#login #warning").html("There is no account with that email").fadeIn();
				setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			}
			else
			{
				$("div#login #warning").html("Can't remember password. Please try again later").fadeIn();
				setTimeout(function(){$("div#login #warning").fadeOut()},2000);
			}
		});
	},
	subscribe: function(sub) {
		var me=this;
		me.subscribers.push(sub);
	},
	unsubscribe: function(sub) {
		var me=this;
		me.subscribers.splice(me.subscribers.indexOf(sub),1);
	}
}
