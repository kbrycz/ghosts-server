const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 10000,
    pingTimeout: (1000 * 60) * 30,
    cookie: false
});

let rooms = {}


// -------------------------------------ONCE A SOCKET HAS CONNECTED--------------------------------------

io.on('connection', (socket) => {

    console.log('We have a connection!');

    socket.on('createRoom', (obj) => {
        console.log(obj)
        if (obj.roomName in rooms) {
            console.log('Error: room name already in use')
        } else {
            rooms[obj.roomName] = {hostName: obj.hostName, hostSocket: socket.id}
            socket.join(obj.roomName)
            console.log('created room: ' + obj.roomName);
            io.in(obj.roomName).emit('createRoom', obj);
        }
    });

    socket.on('isRoomAvailable', (roomName) => {
        console.log(roomName)
        if (roomName in rooms) {
            console.log("Room found with code " + roomName)
            const obj = {roomName: roomName, hostName: rooms[roomName].hostName}
            console.log(obj)
            socket.emit('roomFound', obj)
        } else {
            console.log("No room found with code " + roomName)
            socket.emit('roomNotFound', roomName)
        }     
    })

    socket.on('addPlayerToLobby', (obj) => {
        if (obj.roomName in rooms) {
            console.log("Room found with code " + obj.roomName)
            io.to(rooms[obj.roomName].hostSocket).emit('addPlayerToLobby', obj.player);
        } else {
            console.log('Host deleted game with code ' + obj.roomName)
        }
    }) 

    socket.on('hostUpdatePlayerToLobby', (obj) => {
        socket.to(obj.roomName).emit('updatePlayersArray', obj)
    })
});

// -----------------LISTEN ON PORT 80-----------------

http.listen(3000, () => console.log('listening on port 3000'))