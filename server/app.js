const express = require('express');
const { createServer } = require('node:http');

const { Server } = require('socket.io');

const app = express();
const server = createServer(app);

let users = 0;

const ip = '169.254.210.230';

setInterval(() => {
    if (users <= 0) return;
    let msg = Math.random();
    console.log(`Broadcasting ${msg}`);
    io.emit('master', `${msg}`);
}, 500);

const io = new Server(server, {
    cors: {
        origin: `http://${ip}:5500`,
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    users++;
    console.log('User Connected');
    socket.on('disconnect', () => {
        users--;
        console.log('User Disconnected');
    });
});

app.get('/', (req, res) => {
    res.send('<h1>Hello world</h1>');
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});
