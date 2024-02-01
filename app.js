// Variables to manage server
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

    // Host creates a room
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

    // Checks if room is available but does not join yet
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

    // Adds a player to the lobby if they are allowed
    socket.on('addPlayerToLobby', (obj) => {
        if (obj.roomName in rooms) {
            if (rooms[obj.roomName].numPlayers + 1 > 12 || rooms[obj.roomName].isStarted) {
                socket.emit('roomFull')
                return
            }
            if (socket.id in socketRooms) {
                console.log("User has already joined the game.")
                return
            }
            console.log("Trying to send message to host in room " + obj.roomName)
            socket.join(obj.roomName)
            socketRooms[socket.id] = obj.roomName
            rooms[obj.roomName].numPlayers += 1
            io.to(rooms[obj.roomName].hostId).emit('hostAddPlayer', obj.player);
        } else {
            console.log('Host deleted game with code ' + obj.roomName)
        }
    }) 

    // Host recieves player info and passes it on to the rest of the players
    socket.on('hostUpdatePlayerToLobby', (obj) => {
        console.log("Got obj from host. Updating array for everyone")
        socket.to(obj.gameData.code).emit('updatePlayersArray', obj)
    })

    // Updates the ready up button
    socket.on('updateReadyUp', (obj) => {
        console.log("A player has ready upped")
        io.to(obj.code).emit('updateReadyUp', obj.playersInLobby)
    })

    // ----------------Players leaving the game---------------------

    // If player clicks the leaving game button
    socket.on('leavingGame', (code) => {
        console.log("Player clicked the leaving game button. Disconnecting their socket")
        socket.disconnect()
    })

    // Player has disconnected from the game
    socket.on('disconnect', () => {
        console.log("user has disconnected")
        const code = socketRooms[socket.id]
        if (!code || !code in rooms) {
            return
        }

        // Host is the one who disconnected
        if (rooms[code].hostId === socket.id) {
            console.log("Host is ending the game")
            rooms[code].numPlayers -= 1

            socket.to(code).emit("hostEndedGame")
            delete socketRooms[socket.id]
            if (rooms[code].hasOwnProperty('numPlayers') && rooms[code].numPlayers < 1) {
                console.log("deleting room")
                delete rooms[code]
            }
        } 
        // Normal player disconnected
        else {
            console.log("A normal player has disconnected from the game")
            rooms[code].numPlayers -= 1

            socket.to(code).emit("playerLeftLobby", socket.id)
            delete socketRooms[socket.id]
            if (rooms[code].hasOwnProperty('numPlayers') && rooms[code].numPlayers < 1) {
                console.log("deleting room")
                delete rooms[code]
            }
        }
      })


    // -----------------Game Set up-----------------

    // Shuffles an array
    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Gets the starter data and creates the game and starts it
    socket.on('startGame', (obj) => {
        console.log("Host wants to start game. Setting up now...")

        if (rooms[obj.code].isStarted) {
            console.log("Already started the game")
            return
        }
        rooms[obj.code].isStarted = true
        let playersFinal = shuffle(obj.players)
        const words = obj.gameData.wordSet
        let count = 0
        // Get all of the subtopic people in
        for (let i = 0; i < obj.gameData.numSubs; ++i) {
            if (words.subs[i].hasOwnProperty('word')) {
                playersFinal[count].word = words.subs[i].word
            } else {
                playersFinal[count].word = words.subs[i]
            }
            
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
            players: shuffle(playersFinal),
            code: obj.code
        }
        console.log("Sending game info to players")
        io.in(obj.code).emit("startGame", newObj)
    })

    // -----------------Gameplay-----------------

    // Updates a player vote
    socket.on('updateVote', (obj) => {
        console.log("Updating the vote amount and sending users back players array")
        io.in(obj.code).emit("updatePlayers", obj.players)
    })

    // Lets everyone know that the voting is finished
    socket.on('votingFinished', (obj) => {
        console.log("The voting has found a majority: " + obj.startingPlayerId)
        io.in(obj.code).emit("votingFinished", obj)
    })

    // Deletes a player from the game
    socket.on('deletePlayer', (obj) => {
        console.log("Attempting to mark play as dead")
        io.in(obj.roomName).emit("deletePlayer", obj)
    })

    // -----------------Game over-----------------

    // Lets players know that the ghost has guessed
    socket.on('ghostGuessed', (obj) => {
        console.log("A ghost has guessed!")
        io.in(obj.code).emit("ghostGuessed", obj)
    })
});

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});

// -----------------LISTEN ON PORT 80-----------------

http.listen(3000, () => console.log('listening on port 3000'))