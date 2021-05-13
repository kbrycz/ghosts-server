const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 10000,
    pingTimeout: (1000 * 60) * 30,
    cookie: false
});

let rooms = []


// -------------------------------------ONCE A SOCKET HAS CONNECTED--------------------------------------

io.on('connection', (socket) => {

    console.log('We have a connection!');

    socket.on('createRoom', (roomName) => {
        console.log(roomName)
        if (rooms.includes(roomName)) {
            console.log('Error: room name already in use')
        } else {
            rooms.push(roomName)
            socket.join(roomName)
            console.log('created room: ' + roomName);
            io.in(roomName).emit('createRoom', socket.id);
        }
    });

});

// -----------------LISTEN ON PORT 80-----------------

http.listen(3000, () => console.log('listening on port 3000'))