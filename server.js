var express = require('express');
var app = express();
var server  = require('http').createServer(app);
var io = require('socket.io').listen(server);
var sockets = {};
var mysql = require("mysql");


var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "chat"
});

con.connect(function(err){
  if(err){
	throw err;
  }
  console.log('Connection established');
});

io.on("connection", function(socket){
	var userId = socket.handshake.query.userId;
	if (sockets[userId]) {
		sockets[userId].push(socket);
	} else {
		sockets[userId] = [socket];
	}
	
	
	socket.on("pkl-send-message", function(data){
		if (!data.message) {
			return;
		}
		var message = { sender: data.sender , receiver: data.userId, message: data.message, sentDate : new Date(), status: '1' };
		
		var receivers = sockets[data.userId];
		
		if (!receivers) {
			var result_status = {
				'status': 'ERROR',
				'message': 'User is now offile'
			};
			socket.emit("pkl-message-status", result_status);
			return;
		}
		var sendError;
		for ( var i=0; i< receivers.length; i++) {
			var receiver = receivers[i];
			var result = {
				'userId': data.sender,
				'message': data.message,
				'sentDate': new Date()
			}
			try {
				receiver.emit("pkl-message", result);
			} catch (err) {
				sendError = err;
				
			}
		}
		if (sendError) {
			var result_status = {
					'status': 'ERROR',
					'message': sendError
				};
			socket.emit('pkl-message-status', result_status);
		}
		var result_status = {
			'status': 'OK',
			'message': data.message
		};
		socket.emit('pkl-message-status', result_status);
		con.query('INSERT INTO message SET ?', message, function(err){
			if(err) {
				var result = {
				'status': 'ERROR',
				'message': err
				}
				error = true;
				socket.emit("pkl-message-status", result);
			}

		});
	});

	socket.on("pkl-get-history", function(data){
		if (data.page) {
			sql = 'SELECT * FROM message WHERE sender = '+data.userId+' OR receiver = '+data.userId+' ORDER BY ID LIMIT '+data.page*10+',10';
		} else {
			sql = 'SELECT * FROM message WHERE sender = '+data.userId+' OR receiver = '+data.userId+' ORDER BY ID';
		}
		con.query(sql, function(err,rows){
			if(err) {
				var result = {
				'status': 'ERROR',
				'message': err
				}
				socket.emit("pkl-history", result);
				return;
			}
			
		
			var result = {
				'status': 'OK',
				'history': rows
			}
			try {
				socket.emit("pkl-history", result);
				console.log(rows);
			} catch (err) {
				var result = {
				'status': 'ERROR',
				'message': err
				}
				socket.emit("pkl-history", result);
				return;
			}
			
				
		});
		
		
	});
	
	
});
app.get('/', function (req, res) {
	//res.sendFile(__dirname, "index.html");
	res.sendfile("index.html");
});

server.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

   console.log('Example app listening at http://%s:%s', host, port);

});
