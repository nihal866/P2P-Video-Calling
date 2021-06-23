const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', function(socket){
	console.log('a user connected');
	socket.on('create or join', function(room){
		console.log('create or join to room ', room);
		room = room.trim();
    	const myRoom = io.sockets.adapter.rooms.get(room) || { size: 0 };
    	const numClients = myRoom.size;
		console.log(room, 'has', numClients, ' clients');

		if(numClients == 0){
			socket.join(room);
			socket.emit('created', room);
		}else if(numClients == 1){
			socket.join(room);
			socket.emit('joined', room);
		}else{
			socket.emit('full', room);
		}
	});

	socket.on('ready', function(room){
		socket.broadcast.to(room).emit('ready');
	});
	socket.on('candidate', function(event){
		socket.broadcast.to(event.room).emit('candidate', event);
	});
	socket.on('offer', function(event){
		socket.broadcast.to(event.room).emit('offer', event.sdp);
	});
	socket.on('answer', function(event){
		socket.broadcast.to(event.room).emit('answer', event.sdp);
	});
});


http.listen(process.env.PORT || 3000, function(){
	console.log("Server has started successfully");
});