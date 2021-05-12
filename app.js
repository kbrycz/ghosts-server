const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 10000,
    pingTimeout: (1000 * 60) * 30,
    cookie: false
});


// -------------------------------------ONCE A SOCKET HAS CONNECTED--------------------------------------

io.on('connection', (socket) => {

    console.log("connected")

});

// -----------------LISTEN ON PORT 80-----------------

http.listen(3000, () => console.log('listening on port 3000'))