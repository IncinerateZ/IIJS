const express = require('express');
const { createServer } = require('node:http');

const { Server } = require('socket.io');
const UUID = require('./src/Utils/UUID');
const Snowflake = require('./src/Utils/Snowflake');
const Game = require('./src/Game/Game');

const app = express();
const server = createServer(app);

const players = {};

const games = {};
const gameQueue = {};

//first two lobbies
createGame();
createGame();

function createGame() {
    let id = Snowflake.generate();

    gameQueue[id] = new Game(
        id,
        _dequeueGame,
        createGame,
        enqueuePlayer,
        _endGame,
    );
}

function _endGame(id) {
    console.log(`${id} ended`);
    delete games[id];
}

function _dequeueGame(id, erase) {
    if (!erase) games[id] = gameQueue[id];
    delete gameQueue[id];
}

function enqueuePlayer(uid) {
    for (let game in gameQueue) {
        game = gameQueue[game];

        if (game.gameState === 'matching') {
            let added = game.addPlayer(players[uid]);
            if (added) break;
        }
    }
}

const io = new Server(server, {
    cors: {
        origin: `*`,
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    console.log('User Connected');

    socket.on('player_connect', (ign) => {
        let uid = UUID.generate();
        players[uid] = {
            uuid: uid,
            game: { ign: ign },
            socket: socket,
            gameId: -1,
        };

        socket.emit('set_id', uid);

        //add to matchmaking queue
        enqueuePlayer(uid);
    });

    socket.on('disconnect', () => {
        for (let player in players) {
            if (!players[player].socket.connected) {
                gameQueue[players[player]?.gameId]?.removePlayer(player);
                games[players[player]?.gameId]?.removePlayer(player);

                delete players[player];
            }
        }

        console.log('User Disconnected');
    });

    socket.on('ping', () => {
        socket.emit('pong');
    });
});

app.get('/', (req, res) => {
    res.send('<h1>Hello world</h1>');
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});
