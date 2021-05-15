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

    socket.on('createRoom', (obj) => {
        console.log(obj)
        if (rooms.includes(obj.roomName)) {
            console.log('Error: room name already in use')
        } else {
            rooms.push(obj.roomName)
            socket.join(obj.roomName)
            console.log('created room: ' + obj.roomName);
            io.in(obj.roomName).emit('createRoom', obj);
        }
    });

    // socket.on('joinLobby', (roomName) => {
    //     console.log("inside joinLobby");
    //     if (rooms.includes(roomName)) {
    //         rooms.push(roomName)
    //         socket.join(roomName)
    //         let obj = {
    //             'room': roomName,
    //             'id': socket.id
    //         }
    //         io.in(roomName).emit('joinRoom', obj);
    //     } else {
    //         console.log('Error: No room with this name')
    //         socket.emit('noRoom', roomName);
    //     }
    // }) 

});

// -----------------LISTEN ON PORT 80-----------------

http.listen(3000, () => console.log('listening on port 3000'))