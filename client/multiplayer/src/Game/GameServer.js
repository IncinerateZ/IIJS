export default class GameServer {
    constructor(io, client) {
        this.io = io;
        this.ip = window.location.hostname;

        this.uuid = null;

        this.client = client;

        this.playersAccepted = 0;

        this.ign = window.localStorage.getItem('username');

        this.socket = io(`${this.ip}:3000`);

        this.socket.emit('player_connect', this.ign);

        this.socket.on('set_id', (uid) => {
            this.uuid = uid;
            console.log('set_id ' + uid);

            this.setStatus('title', 'Finding a game...');
        });

        this.socket.on('game_matching', (payload) => {
            console.log('MATCHMAKING');
            console.log(payload);

            this.client.playSound('GAME_FOUND');

            this.resetMatching(payload.playersCount);

            this.showMatching();

            if (payload.abort) {
                this.playersAccepted = 0;
                this.showMatching(true);
                return console.log('ABORTED');
            }

            let readyBtn = document.getElementById('ready');
            readyBtn.onclick = () => {
                console.log('click');
                this.client.playSound('BUTTON_CLICK');
                readyBtn.disabled = true;
                this.socket.emit(payload.trigger, {});
            };
        });

        this.socket.on('game_launching', (payload) => {
            this.showMatching(true);
            this.setStatus('title', 'Launching...');
            console.log('launching');
            if (payload.listen)
                this.socket.on(payload.listen, (data) => {
                    this.setWorld(data, payload.trigger, true);
                    this.client.playSound('BACKGROUND');
                });
        });

        this.socket.on('game_countdown', (payload) => {
            console.log(`countdown ${payload.time}`);

            document.getElementById('title-screen').style.display = 'none';

            function countdown(i) {
                if (i > 3)
                    return (document.getElementById(
                        'countdown-screen',
                    ).style.display = 'none');

                document.getElementById('countdown').innerHTML = [
                    '3',
                    '2',
                    '1',
                    'GO!',
                ][i];

                setTimeout(() => {
                    countdown(i + 1);
                }, 1000);
            }

            countdown(0);
            this.client.playSound('COUNTDOWN');

            document.onkeydown = (e) => {
                let pivot = {
                    arrowup: [0, -1],
                    arrowright: [1, 0],
                    arrowdown: [0, 1],
                    arrowleft: [-1, 0],
                }[e.key.toLowerCase()];
                if (pivot) this.socket.emit('player_pivot', pivot);
            };
        });

        this.socket.on('game_accepted', () => {
            this.client.playSound('PLAYER_READY');
            document.getElementById(
                `ready-${++this.playersAccepted}`,
            ).style.backgroundColor = 'green';
        });

        this.socket.on('game_playerJoin', (payload) =>
            console.log(payload.msg),
        );

        this.socket.on('game_update', (payload) =>
            this.setWorld(payload, payload.trigger, false),
        );

        this.socket.on('player_events', (payload) => {
            for (let event in payload)
                this.client.playSound(event.toUpperCase());
        });

        this.socket.on('game_ended', (payload) => {
            if (payload.uuid === this.uuid) this.client.playSound('VICTORY');
            else this.client.playSound('DEFEAT');

            this.client.resultsScreen(payload);
        });
    }

    setWorld(payload, trigger, firstRender) {
        console.log('setworld');

        this.client.render(payload, firstRender);

        if (trigger) this.socket.emit(trigger, {});
    }

    setStatus(screen, status) {
        document.getElementById(`${screen}-status`).innerText = status;
    }

    showMatching(hide) {
        document.getElementById('matching-screen').style.display = hide
            ? 'none'
            : 'flex';
    }

    resetMatching(num) {
        let container = document.getElementById('show-ready-container');

        let readyBtn = document.getElementById('ready');
        readyBtn.removeAttribute('disabled');

        container.innerHTML = '';
        for (let i = 1; i <= num; i++)
            container.innerHTML += `<div id="ready-${i}"></div>`;
    }
}
