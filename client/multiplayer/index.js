import GameClient from './src/Game/GameClient.js';
import GameServer from './src/Game/GameServer.js';

let client;

window.onload = () => {
    console.log('Load');

    autoName();

    client = new GameClient();
    client.loadAssets();
};

function autoName() {
    let name = window.localStorage.getItem('username');
    if (name) document.getElementById('username').value = name;
}

window._setName = function () {
    let name = document.getElementById('username').value;

    client.playSound('BUTTON_CLICK');
    client.playSound('MUSIC');

    if (name.length < 3 || name.length > 12) return;

    document.getElementById('user-screen').style.display = 'none';

    window.localStorage.setItem('username', name);
    client.connect(new GameServer(io, client));
};

window._return = function () {
    client.playSound('BUTTON_CLICK');

    setTimeout(() => {
        window.location = '/Snake.html';
    }, 200);
};

window._cancelMatching = function () {
    client.playSound('BUTTON_CLICK');

    setTimeout(() => {
        window.location.reload();
    }, 200);
};
