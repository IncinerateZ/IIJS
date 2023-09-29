import GameClient from './src/Game/GameClient.js';
import GameServer from './src/Game/GameServer.js';

let client;

window.onload = () => {
    console.log('Load');

    client = new GameClient();
    client.loadAssets();
};

window._setName = function () {
    let name = document.getElementById('username').value;
    client.playSound('BUTTON_CLICK');
    if (name.length < 3 || name.length > 12) return;

    client.playSound('MUSIC');

    document.getElementById('user-screen').style.display = 'none';

    window.localStorage.setItem('username', name);
    client.connect(new GameServer(io, client));
};
