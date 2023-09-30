export default class GameClient {
    constructor() {
        this.Sounds = {
            BACKGROUND: {
                sound: 'bg_ambient',
                start: -1,
                stop: -1,
                volume: 0.025,
            },
            MUSIC: { sound: 'bg_music', start: -1, stop: -1, volume: 0.2 },
            BUTTON_CLICK: { sound: 'click', start: 0.5, stop: -1, volume: 0.9 },
            COUNTDOWN: { sound: 'countdown', start: -1, stop: -1, volume: 0.5 },
            DEATH: { sound: 'death', start: -1, stop: -1, volume: 0.5 },
            EAT: { sound: 'eat', start: 0.5, stop: 0.55, volume: 0.5 },
            EMBER_SPAWN: {
                sound: 'ember_spawn',
                start: -1,
                stop: 2.5,
                volume: 0.1,
            },
            FIRE_IGNITE: {
                sound: 'fire_ignite',
                start: -1,
                stop: 1,
                volume: 0.3,
            },
            COUNTDOWN: {
                sound: 'countdown',
                start: -1,
                stop: 3.9,
                volume: 0.05,
            },
            GAME_FOUND: {
                sound: 'game_found',
                start: -1,
                stop: -1,
                volume: 0.3,
            },
            PLAYER_READY: {
                sound: 'player_ready',
                start: 0.1,
                stop: -1,
                volume: 0.1,
            },
            VICTORY: {
                sound: 'victory',
                start: -1,
                stop: -1,
                volume: 0.1,
            },
            DEFEAT: {
                sound: 'defeat',
                start: -1,
                stop: -1,
                volume: 0.1,
            },
        };

        this.Images = {
            snake: { head: {}, body: {}, tail: {}, bend: {} },
            environment: { ember: null, fire: null, meat: null, grass: null },
        };

        this.width = document.getElementById('game').clientWidth;
        this.height = document.getElementById('game').clientHeight;
    }

    connect(server) {
        this.server = server;
    }

    playSound(name) {
        let sound = this.Sounds[name];

        sound.audio.currentTime = 0;

        if (sound.start !== -1) sound.audio.currentTime = sound.start;

        sound.audio.play();

        if (sound.stop !== -1)
            setTimeout(() => {
                sound.audio.pause();
            }, sound.stop * 1000);
    }

    render(data, firstRender) {
        for (let d in data) this[d] = data[d];

        if (firstRender) {
            //recolor snakes
            for (let type in this.Images.snake) {
                let base = this.Images.snake[type];
                this.Images.snake[type] = {};
                for (let color of this.snakeColors) {
                    this.Images.snake[type][color] = base.replaceAll(
                        this.baseColor.toUpperCase(),
                        color.toUpperCase(),
                    );

                    if (this.players[this.server.uuid].color === color) {
                        this.Images.snake[type][color] = this.Images.snake[
                            type
                        ][color].replaceAll(
                            'stroke="black"',
                            'stroke="#F5FF83"',
                        );
                        this.Images.snake[type][color] = this.Images.snake[
                            type
                        ][color].replaceAll(
                            'stroke-width="2"',
                            'stroke-width="4"',
                        );
                    }
                }
            }

            this.blockWidth = this.width / this.mapWidth;
            this.blockHeight = this.height / this.mapHeight;

            let grassField = document.getElementById('grass');

            for (let y = 0; y < this.mapHeight; y++) {
                for (let x = 0; x < this.mapWidth; x++) {
                    let grass = document.createElement('div');
                    grass.innerHTML = this.Images.environment.grass;

                    this.toBlock(grass, x, y);

                    grassField.appendChild(grass);
                }
            }
        }

        console.log(this);

        let canvas = document.getElementById('game');
        canvas.innerHTML = '';

        //draw order: embers & fire, food, snake
        for (let y in this.obstacles) {
            for (let x in this.obstacles[y]) {
                let obstacle = document.createElement('div');

                this.toBlock(obstacle, x, y);

                obstacle.innerHTML = this.Images.environment['fire'];

                canvas.appendChild(obstacle);
            }
        }

        for (let y in this.embers) {
            for (let x in this.embers[y]) {
                let ember = document.createElement('div');

                this.toBlock(ember, x, y);

                ember.innerHTML = this.Images.environment['ember'];

                canvas.appendChild(ember);
            }
        }

        for (let y in this.foods) {
            for (let x in this.foods[y]) {
                let food = document.createElement('div');
                food.innerHTML = this.Images.environment.meat;

                this.toBlock(food, x, y);

                canvas.appendChild(food);
            }
        }

        for (let player in this.players) {
            for (let i = 0; i < this.players[player].snake.length; i++) {
                let current = this.players[player].snake[i];
                let snake_prev = this.players[player].snake[i - 1];
                let snake_next = this.players[player].snake[i + 1];
                this.drawSnake(
                    canvas,
                    current[0],
                    current[1],
                    snake_prev,
                    snake_next,
                    this.players[player],
                );
            }
        }
    }

    drawSnake(canvas, x, y, snake_prev, snake_next, player) {
        var newDiv = document.createElement('div');
        let color = player.color;

        let rot = '';

        //tail
        if (!snake_prev && snake_next) {
            let vector =
                this.getSign(snake_next[0] - x) +
                ',' +
                this.getSign(snake_next[1] - y);

            let rotation = { '0,-1': 0, '0,1': 180, '-1,0': -90, '1,0': 90 }[
                vector
            ];

            newDiv.innerHTML = this.Images.snake.tail[color];

            rot = `${rotation}deg`;
        }

        //head
        else if (!snake_next) {
            if (!snake_prev)
                snake_prev = [x - player.dir[0], y - player.dir[1]];
            let vector =
                this.getSign(x - snake_prev[0]) +
                ',' +
                this.getSign(y - snake_prev[1]);

            let rotation = { '0,-1': 0, '0,1': 180, '-1,0': -90, '1,0': 90 }[
                vector
            ];

            newDiv.innerHTML = this.Images.snake.head[color];

            rot = `${rotation}deg`;
        }

        //straight
        else if (
            snake_prev[0] === snake_next[0] ||
            snake_prev[1] === snake_next[1]
        ) {
            let vector =
                this.getSign(x - snake_prev[0]) +
                ',' +
                this.getSign(y - snake_prev[1]);

            let rotation = { '0,-1': 0, '0,1': 180, '-1,0': -90, '1,0': 90 }[
                vector
            ];

            newDiv.innerHTML = this.Images.snake.body[color];

            rot = `${rotation}deg`;
        }

        //bend
        else {
            let vector =
                this.getSign(snake_next[0] - snake_prev[0]) +
                ',' +
                this.getSign(snake_next[1] - snake_prev[1]);

            let rotation = null;

            if (x === snake_prev[0]) {
                rotation = {
                    '1,-1': 0,
                    '-1,1': 180,
                    '-1,-1': 90,
                    '1,1': -90,
                }[vector];
            } else {
                rotation = {
                    '1,-1': 180,
                    '-1,1': 0,
                    '-1,-1': -90,
                    '1,1': 90,
                }[vector];
            }

            newDiv.innerHTML = this.Images.snake.bend[color];

            rot = `${rotation}deg`;
        }

        console.log(x + ' ' + y + ' ' + rot);
        this.toBlock(newDiv, x, y, rot);

        canvas.appendChild(newDiv);
    }

    getSign(n) {
        if (n === 0) return 0;
        return n / Math.abs(n);
    }

    toBlock(div, x, y, rotation) {
        div.style.width = `${this.blockWidth}px`;
        div.style.height = `${this.blockHeight}px`;

        div.style.transform = `translate(${x * this.blockWidth}px, ${
            y * this.blockHeight
        }px)${rotation ? ` rotate(${rotation})` : ''}`;
    }

    loadAssets() {
        for (let track in this.Sounds) {
            track = this.Sounds[track];
            track.audio = new Audio(`../../assets/audio/${track.sound}.mp3`);
            track.audio.volume = track.volume;
        }

        for (let entity in this.Images) {
            for (let type in this.Images[entity]) {
                fetch(`../../assets/${entity}/${type}.svg`)
                    .then((res) => res.text())
                    .then((res) => {
                        this.Images[entity][type] = res;
                    });
            }
        }

        console.log(this.Images);
    }

    resultsScreen(payload) {
        let screen = document.getElementById('results-screen');
        screen.style.display = 'flex';

        console.log(payload);

        screen.innerHTML = `<span>You ${
            payload.uuid === this.server.uuid ? 'Won' : 'Lost'
        }!</span>
        <span>${payload.ign} Won.</span>
        <span>Returning to lobby in 10 seconds...</span>`;

        setTimeout(() => {
            window.location.reload();
        }, 10000);
    }
}
