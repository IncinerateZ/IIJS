// Name: Justin
// Date:
// Version:
// Project: Snake Game

const ip = window.location.hostname;

window.onload = () => {
    console.log('Load');
    loadAssets();
};

var Timer;

const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const Board = [];
const Snake = {
    snake: [
        [10, 10],
        [11, 10],
        [12, 10],
    ],
    doGrow: false,
    dir: [1, 0],
    tentativeDir: [2, 0],
    symbol: 'S',
    color: 'base',
};

const Bot = {
    snake: [],
    doGrow: false,
    dir: [1, 0],
    tentativeDir: [2, 0],
    spawned: false,
    symbol: 'B',
    color: 'lavender',
};

let pendingObstacles = [];
let obstacles = {};
let obstacleDelay = 5000;

let Apple = [5, 5];

const tickRate = 200;

function DrawBoard() {
    let tempgrid = document.createElement('div');
    tempgrid.id = 'grid_id';
    tempgrid.className = 'grid';

    for (let _y = 0; _y < 20; _y++) {
        Board[_y] = [];
        for (let _x = 0; _x < 20; _x++) {
            let symbol = '.';
            if (obstacles[`${_y}.${_x}`] === 1) symbol = 'P';
            symbol = isObstacle(obstacles, _y, _x) ? 'W' : symbol;

            let snake_prev, snake_next;
            for (let si = 0; si < Snake.snake.length; si++) {
                let s = Snake.snake[si];
                if (_x === s[0] && _y === s[1]) {
                    symbol = 'S';
                    snake_prev = Snake.snake[si - 1];
                    snake_next = Snake.snake[si + 1];
                    break;
                }
            }

            let isBot = false;
            if (!snake_next && !snake_prev) isBot = true;

            for (let si = 0; si < Bot.snake.length; si++) {
                let s = Bot.snake[si];
                if (_x === s[0] && _y === s[1]) {
                    symbol = 'B';
                    if (isBot) {
                        snake_prev = Bot.snake[si - 1];
                        snake_next = Bot.snake[si + 1];
                    }
                    break;
                }
            }
            if (_x === Apple[0] && _y === Apple[1]) symbol = 'A';
            Board[_y].push(symbol);
            AddBlock(
                _y,
                _x,
                {
                    W: 'fire',
                    '.': 'grass',
                    S: Snake.color,
                    A: 'meat',
                    P: 'ember',
                    B: Bot.color,
                }[symbol],
                snake_prev,
                snake_next,
                tempgrid,
            );
        }
    }

    RenderGrid(tempgrid);
    document.getElementById('score').innerText = Snake.snake.length;
}

function SinglePlayer() {
    playSound('MUSIC');
    playSound('BUTTON_CLICK');
    document.getElementById('ui-layer').style.display = 'none';
}

function MultiPlayer() {
    playSound('BUTTON_CLICK');

    //sequence hack
    setTimeout(() => {
        let ign = '';
        do {
            ign = prompt('Enter a username (3 - 12 chars) for multiplayer');
        } while (!(ign.length >= 3 && ign.length <= 12));

        window.localStorage.setItem('username', ign);

        window.location = window.location.origin + '/multiplayer';
    }, 0);
}

function GameOver() {
    clearInterval(Timer);

    setTimeout(() => {
        alert(`You Died! Game Over!\nYour Score Is ${Snake.snake.length}!`);
        window.location.reload();
    }, 200);
}

function Reset() {
    window.location.reload();
}

function CreateApple() {
    let randX = Math.floor(Math.random() * 20);
    let randY = Math.floor(Math.random() * 20);

    let boardAt = Board[randY][randX];

    if (
        boardAt === 'W' ||
        boardAt === 'S' ||
        boardAt === 'B' ||
        boardAt === 'P'
    )
        return CreateApple();

    let reset = setTimeout(() => {
        if (randX === Apple[0] && randY === Apple[1]) Apple = CreateApple();
    }, 15000);
    return [randX, randY];
}

function StartGame() {
    playSound('BUTTON_CLICK');
    playSound('BACKGROUND');
    document.getElementById('start-layer').style.display = 'none';
    Timer = setInterval(() => {
        Tick();
    }, tickRate);

    DrawBoard();
    document.addEventListener('keydown', KeyPressed);

    let mainBtn = document.getElementById('mainBtn');
    mainBtn.innerText = 'Restart';
    mainBtn.onclick = Reset;
}

function Tick() {
    if (Bot.snake.length < 5) Bot.doGrow = true;

    if (Snake.tentativeDir[0] !== 2) {
        Snake.dir = Snake.tentativeDir;
        Snake.tentativeDir = [2, 0];
    }

    //Bot AI
    if (Bot.snake.length > 0) {
        let botHead = Bot.snake[Bot.snake.length - 1];

        //move to the next free space that is closest to the apple
        const avoidSymbols = { W: true, S: true, B: true };

        if (obstacleDelay <= 2500) avoidSymbols.P = true;

        //get unit vector of direction to apple
        let vApple = [
            getSign(Apple[0] - botHead[0]),
            getSign(Apple[1] - botHead[1]),
        ];

        let _tentativeDirs = [];

        for (let v in vectors) {
            let boardAtV =
                Board[botHead[1] + vectors[v][1]][botHead[0] + vectors[v][0]];

            if (!(boardAtV in avoidSymbols)) _tentativeDirs.push(vectors[v]);
        }

        //rank moves by similarity to apple unit vector
        function botVRank(vApple, v) {
            let rank = 1;

            if (v[0] === vApple[0]) rank--;
            if (v[1] === vApple[1]) rank--;

            return rank;
        }

        _tentativeDirs.sort(
            (a, b) => botVRank(vApple, a) - botVRank(vApple, b),
        );

        let _tentativeDir = [1, 0];

        //select highest ranked move that is not an opposite direction move
        for (let t of _tentativeDirs) {
            if (isReverseDirection(t, Bot.dir)) continue;
            _tentativeDir = t;
            break;
        }

        //pend move for action
        Bot.tentativeDir = _tentativeDir;

        if (Bot.tentativeDir[0] !== 2) {
            Bot.dir = Bot.tentativeDir;
            Bot.tentativeDir = [2, 0];
        }
    }

    MoveSnake(Bot);
    MoveSnake(Snake);

    obstacleDelay -= tickRate;

    //spawn embers
    if (obstacleDelay <= 0) {
        playSound('EMBER_SPAWN');

        //determine delay to next spawn embers
        obstacleDelay = 7000 + getRandom(-1000, 3500);

        //pick and render embers
        let _pendingObstacles = shapeObstacles(0);

        for (let p of _pendingObstacles) {
            let sCoord = `${p[1]}.${p[0]}`;
            if (obstacles[sCoord] === 2) continue;
            obstacles[sCoord] = 1;
        }

        pendingObstacles.push(..._pendingObstacles);
    }

    //spawn wall chunks if not overlapping
    if (obstacleDelay < 2000) {
        for (let p of pendingObstacles) {
            let sCoord = `${p[1]}.${p[0]}`;

            if (Board[p[1]][p[0]] === 'W') continue;

            if (Board[p[1]][p[0]] !== 'P') {
                delete obstacles[sCoord];
                continue;
            }

            playSound('FIRE_IGNITE');
            obstacles[sCoord] = 2;
        }

        pendingObstacles = [];
    }

    //spawn bot if meets requirements
    if (Snake.snake.length % 10 === 0 && Bot.snake.length === 0) {
        Bot.spawned = true;

        Bot.snake = [
            [
                [1, 1],
                [18, 1],
                [1, 18],
                [18, 18],
            ][Math.floor(getRandom(0, 4))],
        ];

        let _tentativeDirs = [];

        for (let v in vectors) {
            let pX = Bot.snake[0][0] + vectors[v][0];
            let pY = Bot.snake[0][1] + vectors[v][1];

            if (!isObstacle(obstacles, pY, pX)) _tentativeDirs.push(vectors[v]);
        }

        Bot.dir =
            _tentativeDirs[Math.floor(getRandom(0, _tentativeDirs.length))];
    }
}

const shapes = [
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
    ],
    [
        [1, 1],
        [1, 1],
    ],
    [[1]],
    [[1, 1, 1]],
    [[1], [1], [1]],
    [
        [1, 1],
        [1, 0],
        [1, 0],
    ],
    [
        [1, 0],
        [1, 0],
        [1, 1],
    ],
    [
        [1, 1],
        [0, 1],
        [0, 1],
    ],
    [
        [0, 1],
        [0, 1],
        [1, 1],
    ],
];

function shapeObstacles(attempt) {
    //stop after 6 failed attempts
    if (attempt === 6) return [];

    //select random ember shape and check for validity
    let selectedShape = shapes[Math.floor(getRandom(0, shapes.length))];

    let maxX = Board[0].length;
    let maxY = Board.length;

    const topLeft = {
        x: Math.floor(getRandom(1, maxX)),
        y: Math.floor(getRandom(1, maxY)),
    };

    let res = [];

    for (let _y = 0; _y < selectedShape.length; _y++) {
        for (let _x = 0; _x < selectedShape[0].length; _x++) {
            let boardX = topLeft.x + _x;
            let boardY = topLeft.y + _y;

            if (
                boardX < 0 ||
                boardX > maxX - 1 ||
                boardY < 0 ||
                boardY > maxY - 1
            )
                return shapeObstacles(attempt + 1);

            if (selectedShape[_y][_x] === 1) {
                if (
                    Board[boardY][boardX] !== '.' &&
                    Board[boardY][boardX] !== 'W'
                )
                    return shapeObstacles(attempt + 1);
                else res.push([boardX, boardY]);
            }
        }
    }

    return res;
}

//changes: only update direction per tick
function KeyPressed(event) {
    let keyCodeMapping = { 38: 'up', 39: 'right', 40: 'down', 37: 'left' };
    let newDir = keyCodeMapping[event.keyCode];

    if (!newDir || isReverseDirection(vectors[newDir], Snake.dir)) return false;
    UpdateDirection(Snake, newDir);
}

function isReverseDirection(dir1, dir2) {
    return dir1[0] === dir2[0] * -1 && dir1[1] === dir2[1] * -1;
}

function MoveSnake(snake) {
    if (snake.snake.length <= 0) return;
    let moveResult = _MoveSnake(snake.snake, snake.dir, Board, snake);

    if (!moveResult) {
        playSound('DEATH');
        if (snake.symbol === 'B') return (snake.snake = []);
        return GameOver();
    } else if (moveResult === 'A') {
        playSound('EAT');
        snake.doGrow = true;
        Apple = CreateApple();
    }
    DrawBoard();
}

function UpdateDirection(snake, direction) {
    _UpdateDirection(direction, snake.tentativeDir);
}

function _MoveSnake(Snake, dir, Board, Grow) {
    let tail = null;

    //if has pending grow action then dont remove last element
    if (Grow.doGrow) Grow.doGrow = false;
    else tail = Snake.shift();

    let head = Snake[Snake.length - 1];
    let newHead = [head[0] + dir[0], head[1] + dir[1]];

    let nextSymbol = Board[newHead[1]][newHead[0]];

    Snake.push(newHead);

    if (tail) Board[tail[1]][tail[0]] = '.';
    Board[newHead[1]][newHead[0]] = Snake.symbol;

    if (nextSymbol in { W: false, S: false, B: false }) return false;
    return nextSymbol;
}

function _UpdateDirection(direction, dir) {
    dir[0] = vectors[direction][0];
    dir[1] = vectors[direction][1];
}
