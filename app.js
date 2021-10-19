const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 10000,
    pingTimeout: (1000 * 60) * 60,
    cookie: false,
    'reconnection': true,
    'reconnectionDelay': 500,
    'reconnectionAttempts': 10
});

let rooms = new Object()
let socketRooms = new Object()

// -------------------------------------ONCE A SOCKET HAS CONNECTED--------------------------------------

io.on('connection', (socket) => {

    console.log('We have a connection!');

    // -----------------Game Creation and joining-----------------
    socket.on('createRoom', () => {
        let status = true
        let roomName = ''
        while (status) {
            roomName = (Math.floor(10000 + Math.random() * 90000)).toString()
            if (!(roomName in rooms)) {
                status = false
                rooms[roomName]= new Object()
                rooms[roomName].hostId = socket.id
                rooms[roomName].isStarted = false
                rooms[roomName].numPlayers = 1
                socket.join(roomName)
                socketRooms[socket.id] = roomName
                console.log('created room: ' + roomName);
                io.in(roomName).emit('createRoom', roomName);
            }
        }
    });

    socket.on('isRoomAvailable', (roomName) => {
        console.log(roomName)
        if (roomName in rooms) {
            console.log("Room found with code " + roomName)
            socket.emit('roomExists', roomName)
        } else {
            console.log("No room found with code " + roomName)
            socket.emit('roomDoesNotExist', roomName)
        }     
    })

    socket.on('addPlayerToLobby', (obj) => {
        if (obj.roomName in rooms) {
            console.log("Trying to send message to host in room " + obj.roomName)
            socket.join(obj.roomName)
            socketRooms[socket.id] = obj.roomName
            rooms[obj.roomName].numPlayers += 1
            io.to(rooms[obj.roomName].hostId).emit('hostAddPlayer', obj.player);
        } else {
            console.log('Host deleted game with code ' + obj.roomName)
        }
    }) 

    socket.on('hostUpdatePlayerToLobby', (obj) => {
        console.log("Got obj from host. Updating array for everyone")
        socket.to(obj.gameData.code).emit('updatePlayersArray', obj)
    })

    socket.on('updateReadyUp', (obj) => {
        console.log("A player has ready upped")
        socket.to(obj.code).emit('updateReadyUp', obj.playersInLobby)
    })

    // ----------------Players leaving the game---------------------
    socket.on('leavingGame', (code) => {
        console.log("Player clicked the leaving game button. Disconnecting their socket")
        socket.disconnect()
    })

    socket.on('disconnect', () => {
        console.log("user has disconnected")
        const code = socketRooms[socket.id]
        if (!code || !code in rooms) {
            return
        }
        if (rooms[code].hostId === socket.id) {
            console.log("Host is ending the game")
            rooms[code].numPlayers -= 1
            if (!rooms[code].isStarted) {
                socket.to(code).emit("hostEndedGame")
            }
            delete socketRooms[socket.id]
            if (rooms[code].hasOwnProperty('numPlayers') && rooms[code].numPlayers < 1) {
                delete rooms[code]
            }
        } else {
            console.log("A normal player has disconnected from the game")
            rooms[code].numPlayers -= 1
            if (!rooms[code].isStarted) {
                socket.to(code).emit("playerLeftLobby", socket.id)
            }
            delete socketRooms[socket.id]
            if (rooms[code].hasOwnProperty('numPlayers') && rooms[code].numPlayers < 1) {
                delete rooms[code]
            }
        }
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
        let playersFinal = shuffle(obj.players)
        const words = obj.gameData.wordSet
        let count = 0
        // Get all of the subtopic people in
        for (let i = 0; i < obj.gameData.numSubs; ++i) {
            playersFinal[count].word = words.subs[i]
            count += 1
        }
        // Get all of the topic people in
        for (let i = 0; i < obj.gameData.numTops; ++i) {
            playersFinal[count].word = words.topic
            playersFinal[count].isTopic = true
            count += 1
        }       
        for (let i = 0; i < obj.gameData.numGhosts; ++i) {
            playersFinal[count].word = 'ghost'
            playersFinal[count].isGhost = true
            count += 1
        }

        let newObj = {
            gameData: obj.gameData,
            players: shuffle(obj.players),
            code: obj.code
        }
        console.log("Sending game info to players")
        io.in(obj.code).emit("startGame", newObj)
    })

    // -----------------Gameplay-----------------

    socket.on('updateVote', (obj) => {
        socket.in(obj.roomName).emit("updatePlayers", obj.players)
    })

    socket.on('votingFinished', (obj) => {
        console.log("The voting has found a majority: " + obj.startingPlayerId)
        io.in(obj.roomName).emit("votingFinished", obj.startingPlayerId)
    })

    socket.on('deletePlayer', (obj) => {
        console.log("Attempting to mark play as dead")
        io.in(obj.roomName).emit("deletePlayer", obj)
    })

    // -----------------Game over-----------------
    socket.on('ghostsGuessedRight', (roomName) => {
        console.log("A ghost has guessed correctly. Ghosts win!")
        io.in(roomName).emit("ghostsGuessedRight")
    })

    socket.on('ghostsGuessedWrong', (roomName) => {
        console.log("All ghost have guessed incorrectly. Players win!")
        io.in(roomName).emit("ghostsGuessedWrong")
    })

    socket.on('ghostsGuessed', (obj) => {
        console.log("All ghost have guessed incorrectly. Players win!")
        io.in(obj.roomName).emit("ghostsGuessed", obj)
    })
    socket.on('ghostsGuessed', (obj) => {
        console.log("All ghost have guessed incorrectly. Players win!")
        io.in(obj.roomName).emit("ghostsGuessed", obj)
    })
});

// -----------------LISTEN ON PORT 80-----------------

http.listen(3000, () => console.log('listening on port 3000'))