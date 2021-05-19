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

    // -----------------Game Creation and joining-----------------
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
            socket.join(obj.roomName)
            io.to(rooms[obj.roomName].hostSocket).emit('addPlayerToLobby', obj.player);
        } else {
            console.log('Host deleted game with code ' + obj.roomName)
        }
    }) 

    socket.on('hostUpdatePlayerToLobby', (obj) => {
        console.log("Got obj from host. Updating array for everyone")
        console.log(obj.gameData.roomName)
        socket.to(obj.gameData.roomName).emit('updatePlayersArray', obj)
    })

    socket.on('updateReadyUp', (obj) => {
        console.log("A player has ready upped")
        socket.to(obj.roomName).emit('updateReadyUp', obj.playersInLobby)
    })

    // -----------------Game Set up-----------------

    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    socket.on('startGame', (obj) => {
        console.log("Host wants to start game. Setting up now...")
        console.log(obj)
        let playersFinal = shuffle(obj.players)
        const words = obj.gameData.wordSet
        let count = 0
        // Get all of the subtopic people in
        for (let i = 0; i < obj.gameData.numSubs; ++i) {
            playersFinal[count].word = words.subs[i]
            console.log("Inside subtopic")
            console.log(playersFinal[count])
            count += 1
        }
        // Get all of the topic people in
        for (let i = 0; i < obj.gameData.numTops; ++i) {
            playersFinal[count].word = words.topic
            playersFinal[count].isTopic = true
            console.log("Inside topic")
            console.log(playersFinal[count])
            count += 1
        }       
        for (let i = 0; i < obj.gameData.numGhosts; ++i) {
            playersFinal[count].word = 'ghost'
            playersFinal[count].isGhost = true
            console.log("Inside ghost")
            console.log(playersFinal[count])
            count += 1
        }
        console.log(playersFinal)
        io.in(obj.gameData.roomName).emit("startGame", playersFinal)
    })

    socket.on('updateVote', (obj) => {
        console.log("a player has voted/unvoted for the player with id: " + obj.voteId)
        socket.in(obj.roomName).emit("updateVote", obj)
    })

    socket.on('votingFinished', (obj) => {
        console.log("The voting has found a majority: " + obj.startingPlayerId)
        io.in(obj.roomName).emit("votingFinished", obj.startingPlayerId)
    })

    socket.on('deletePlayer', (obj) => {
        console.log("Attempting to mark play as dead")
        io.in(obj.roomName).emit("deletePlayer", obj.eliminatedPlayerId)
    })
});

// -----------------LISTEN ON PORT 80-----------------

http.listen(3000, () => console.log('listening on port 3000'))