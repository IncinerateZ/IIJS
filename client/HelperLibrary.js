//Load Assets

const Assets = {
    snake: { head: {}, body: {}, tail: {}, bend: {} },
    environment: { ember: null, fire: null, meat: null, grass: null },
};

const Sounds = {
    BACKGROUND: { sound: 'bg_ambient', start: -1, stop: -1, volume: 0.025 },
    MUSIC: { sound: 'bg_music', start: -1, stop: -1, volume: 0.2 },
    BUTTON_CLICK: { sound: 'click', start: 0.5, stop: -1, volume: 0.9 },
    COUNTDOWN: { sound: 'countdown', start: -1, stop: -1, volume: 0.5 },
    DEATH: { sound: 'death', start: -1, stop: -1, volume: 0.5 },
    EAT: { sound: 'eat', start: 0.5, stop: 0.55, volume: 0.5 },
    EMBER_SPAWN: { sound: 'ember_spawn', start: -1, stop: 2.5, volume: 0.1 },
    FIRE_IGNITE: { sound: 'fire_ignite', start: -1, stop: 1, volume: 0.3 },
};

function loadAssets() {
    for (let t in Assets) {
        for (let a in Assets[t]) {
            let snakeColors = {
                base: '00771A',
                lavender: 'c482cd',
                red: 'bd2525',
                ocean: '00a4d6',
            };

            fetch(`./assets/${t}/${a}.svg`)
                .then((res) => res.text())
                .then((res) => {
                    if (t === 'snake') {
                        let snakeHeads = document.getElementById('snake-heads');
                        for (let color in snakeColors) {
                            let dat = res;
                            if (color !== 'base') {
                                dat = dat.replaceAll(
                                    snakeColors.base.toUpperCase(),
                                    snakeColors[color].toUpperCase(),
                                );
                            }
                            Assets[t][a][color] = dat;

                            if (a !== 'head') continue;
                            let head = document.createElement('div');
                            head.innerHTML = dat;
                            head.style.width = '25%';
                            head.style.height = '100%';
                            head.style.rotate = '180deg';

                            snakeHeads.appendChild(head);
                        }
                    } else {
                        Assets[t][a] = res;
                    }
                });

            //axios implementation
            // axios.get(`./assets/${t}/${a}.svg`).then((res) => {
            //     if (t === 'snake')
            //         for (let color in snakeColors) {
            //             let dat = res.data;
            //             if (color !== 'base') {
            //                 dat = dat.replaceAll(
            //                     snakeColors.base.toUpperCase(),
            //                     snakeColors[color].toUpperCase(),
            //                 );
            //             }
            //             Assets[t][a][color] = dat;
            //         }
            //     else {
            //         Assets[t][a] = res.data;
            //     }
            // });
        }
    }

    for (let t in Sounds) {
        Sounds[t].sound = new Audio(`./assets/audio/${Sounds[t].sound}.mp3`);
        Sounds[t].sound.volume = Sounds[t].volume;
    }
}

function playSound(name) {
    let sound = Sounds[name];

    sound.sound.currentTime = 0;

    if (sound.start !== -1) sound.sound.currentTime = sound.start;

    sound.sound.play();

    if (sound.stop !== -1)
        setTimeout(() => {
            sound.sound.pause();
        }, sound.stop * 1000);
}

function ClearGrid() {
    var DOMGrid = document.getElementById('grid_id');
    DOMGrid.innerHTML = '';
}

function AddBlock(y, x, color, snake_prev, snake_next, tempgrid) {
    // var DOMGrid = document.getElementById('grid_id');
    var DOMGrid = tempgrid;

    var newDiv = document.createElement('div');
    newDiv.setAttribute('id', 'gx' + x + 'y' + y);

    //if is snake-like
    if (snake_prev || snake_next) {
        //tail
        if (!snake_prev) {
            let vector = [
                getSign(snake_next[0] - x),
                getSign(snake_next[1] - y),
            ];

            let rotation = { '0.-1': 0, 0.1: 180, '-1.0': -90, '1.0': 90 }[
                `${vector[0]}.${vector[1]}`
            ];

            newDiv.innerHTML = Assets.snake.tail[color];

            newDiv.style.rotate = `${rotation}deg`;
        }

        //head
        else if (!snake_next) {
            let vector = [
                getSign(x - snake_prev[0]),
                getSign(y - snake_prev[1]),
            ];

            let rotation = { '0.-1': 0, 0.1: 180, '-1.0': -90, '1.0': 90 }[
                `${vector[0]}.${vector[1]}`
            ];

            newDiv.innerHTML = Assets.snake.head[color];

            newDiv.style.rotate = `${rotation}deg`;
        }

        //straight
        else if (
            snake_prev[0] === snake_next[0] ||
            snake_prev[1] === snake_next[1]
        ) {
            let vector = [
                getSign(x - snake_prev[0]),
                getSign(y - snake_prev[1]),
            ];

            let rotation = { '0,-1': 0, '0,1': 180, '-1,0': -90, '1,0': 90 }[
                `${vector[0]},${vector[1]}`
            ];

            newDiv.innerHTML = Assets.snake.body[color];

            newDiv.style.rotate = `${rotation}deg`;
        }

        //bend
        else {
            let vector = [
                getSign(snake_next[0] - snake_prev[0]),
                getSign(snake_next[1] - snake_prev[1]),
            ];

            let rotation = null;

            if (x === snake_prev[0]) {
                rotation = {
                    '1,-1': 0,
                    '-1,1': 180,
                    '-1,-1': 90,
                    '1,1': -90,
                }[`${vector[0]},${vector[1]}`];
            } else {
                rotation = {
                    '1,-1': 180,
                    '-1,1': 0,
                    '-1,-1': -90,
                    '1,1': 90,
                }[`${vector[0]},${vector[1]}`];
            }

            newDiv.innerHTML = Assets.snake.bend[color];

            newDiv.style.rotate = `${rotation}deg`;
        }
    } else {
        newDiv.innerHTML = Assets.environment[color];
    }

    DOMGrid.appendChild(newDiv);
}

function RenderGrid(tempgrid) {
    let score = document.createElement('div');
    score.id = 'score';
    score.innerText = 0;

    tempgrid.appendChild(score);

    document
        .getElementById('grid-container')
        .replaceChild(tempgrid, document.getElementById('grid_id'));
}

function ChangeBlockColor(x, y, color) {
    targetDiv = document.getElementById('gx' + x + 'y' + y);
    targetDiv.setAttribute('class', color);
}

function isObstacle(obstacles, y, x) {
    return isBorderBlock(y, x) || obstacles[`${y}.${x}`] === 2;
}

function isBorderBlock(y, x) {
    return x === 0 || y === 0 || x === 19 || y === 19;
}

function getRandom(start, end) {
    let base = Math.random() * (end - start);
    return base + start;
}

function getSign(n) {
    if (n === 0) return 0;
    return n / Math.abs(n);
}
