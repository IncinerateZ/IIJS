import GameServer from './src/GameServer/GameServer.js';

window.onload = () => {
    console.log('Load');

    new GameServer(io);
};
