const EmittableEvent = require('../Events/EmittableEvent');
const PlayerPivot = require('../Events/PlayerEvents/PlayerPivot');
const Snowflake = require('../Utils/Snowflake');
const Utils = require('../Utils/Utils');

module.exports = class Game {
    constructor(id, dequeue, enqueue, enqueuePlayer, endGame) {
        this.id = id;
        this.stateId = Snowflake.generate();
        this.prevStateId = -1;

        this.dequeue = dequeue;
        this.enqueue = enqueue;
        this.endGame = endGame;
        this.enqueuePlayer = enqueuePlayer;

        //matching, launching, started, ended
        this.gameState = 'matching';

        this.playersLoaded = 0;
        this.maxPlayers = 2;
        this.playersAlive = 0;

        this.players = {};
        this.foods = {};

        this.snakeColors = ['00771A', 'c482cd', 'bd2525', '00a4d6'];

        this.obstacles = {};
        this.embers = {};

        this.mapWidth = 27;
        this.mapHeight = 27;

        this.minPlayerLength = 3;
        this.TICK_SPEED = 200;

        this.nextEmberSpawnTime = -1;

        this.BASE_IGNITION_TIME = 7500;
        this.BASE_EMBER_SPAWN_TIME = 6000;

        this.shapes = [
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

        this.ActionListeners = {
            player_pivot: (player, payload) => {
                new PlayerPivot(player, payload);
            },
        };
    }

    addPlayer(player) {
        if (this.gameState !== 'matching') return false;
        if (Object.keys(this.players).length >= this.maxPlayers) return false;

        player.gameId = this.id;
        player.ready = false;
        this.players[player.uuid] = player;

        if (Object.keys(this.players).length >= this.maxPlayers) {
            this.enqueue();
            if (this.gameState === 'matching') this.matchmake();
        }

        let playerJoinEvent = new EmittableEvent('game', 'playerJoin');
        playerJoinEvent.addPlayers(player);
        playerJoinEvent.setPayload({
            msg: `Joined ${this.id} of ${
                Object.keys(this.players).length - 1
            } other players.`,
        });
        playerJoinEvent.emit();

        return true;
    }

    removePlayer(id) {
        delete this.players[id];

        if (
            this.gameState === 'matching' &&
            Object.keys(this.players).length < this.maxPlayers
        )
            this.abortMatchmake();
    }

    abortMatchmake(currentStateId) {
        if (currentStateId !== this.stateId) return false;
        this.dequeue(this.id, true);

        let event = new EmittableEvent('game', 'matching');

        for (let player in this.players) {
            this.players[player].socket.removeAllListeners('player_ready');
            event.addPlayers(this.players[player]);
            setTimeout(() => {
                this.enqueuePlayer(player);
            }, 0);
        }

        event.setPayload({
            abort: true,
        });

        event.emit();
    }

    matchmake() {
        this.stateId = Snowflake.generate();

        let matchEvent = new EmittableEvent('game', 'matching');
        let launchEvent = new EmittableEvent('game', 'launching');
        let playerReadiedEvent = new EmittableEvent('game', 'accepted');

        let duration = 10000;

        let currentStateId = this.stateId;
        let abort = setTimeout(() => {
            this.abortMatchmake(currentStateId);
        }, duration);

        let readyNum = 0;

        for (let player in this.players) {
            player = this.players[player];

            player.ready = false;
            matchEvent.addPlayers(player);
            launchEvent.addPlayers(player);
            playerReadiedEvent.addPlayers(player);

            player.socket.on('player_ready', () => {
                console.log(`${player.uuid} ready`);
                player.ready = true;
                readyNum++;

                playerReadiedEvent.emit();
                this.initializeGame(launchEvent, readyNum, abort);
            });
        }

        matchEvent.setPayload({
            time: duration,
            playersReady: 0,
            playersCount: Object.keys(this.players).length,
            trigger: 'player_ready',
        });

        matchEvent.emit();
    }

    initializeGame(launchEvent, readyNum, abort, force = false) {
        let numPlayers = Object.keys(this.players).length;
        if (!force && (numPlayers < this.maxPlayers || readyNum < numPlayers))
            return false;

        this.stateId = Snowflake.generate();

        launchEvent.setPayload({
            trigger: 'player_load',
            listen: 'game_initialize',
        });

        launchEvent.emit();

        this.dequeue(this.id);
        this.gameState = 'launching';

        //setup game world
        this._setup();

        //send world data
        let initializeEvent = new EmittableEvent('game', 'initialize');
        let intializePayload = {
            players: {},
            foods: this.foods,
            obstacles: this.obstacles,
            embers: this.embers,
            mapWidth: this.mapWidth,
            mapHeight: this.mapHeight,
            gameTick: this.stateId,
            snakeColors: this.snakeColors,
            baseColor: this.snakeColors[0],
        };

        for (let player in this.players) {
            player = this.players[player];

            intializePayload.players[player.uuid] = player.game;
            initializeEvent.addPlayers(player);

            player.socket.on('player_load', () => {
                console.log(player.uuid + ' Loaded');
                //start countdown
                this.playersLoaded++;

                if (this.playersLoaded >= Object.keys(this.players).length) {
                    let countdown = 4000;

                    initializeEvent.setType('countdown');
                    initializeEvent.setPayload({ time: countdown });
                    initializeEvent.emit();

                    setTimeout(() => {
                        //start game
                        this.startGame();
                    }, countdown);
                }
            });
        }
        initializeEvent.setPayload(intializePayload);
        initializeEvent.emit();

        return true;
    }

    _setup() {
        //initial obstacles
        for (let _y = 0; _y < this.mapHeight; _y++)
            for (let _x = 0; _x < this.mapWidth; _x++)
                if (
                    _y === 0 ||
                    _y === this.mapHeight - 1 ||
                    _x === 0 ||
                    _x === this.mapWidth - 1
                ) {
                    if (!this.obstacles[_y]) this.obstacles[_y] = {};
                    this.obstacles[_y][_x] = true;
                }

        //spawn food in center 1: respawnable 2: once only
        this.foods[Math.floor(this.mapHeight / 2)] = {};
        this.foods[Math.floor(this.mapHeight / 2)][
            Math.floor(this.mapWidth / 2)
        ] = 1;

        //initial player setup
        let spawnLocs = [
            [1, 1],
            [1, this.mapWidth - 2],
            [this.mapHeight - 2, 1],
            [this.mapHeight - 2, this.mapWidth - 2],
        ];

        let snakeColors = [...this.snakeColors];

        for (let playerId in this.players) {
            let player = this.players[playerId];

            let spawnLoc = spawnLocs.shift();
            let dir = [spawnLoc[0] === 1 ? 1 : -1, 0];

            player.game = {
                ...player.game,
                snake: [spawnLoc],
                hitMap: { [spawnLoc[1]]: { [spawnLoc[0]]: true } },
                doGrow: false,
                color: snakeColors.shift(),
                tentativeDir: [...dir],
                dir: dir,
            };
        }

        this.playersAlive = Object.keys(this.players).length;
    }

    startGame() {
        this.gameState = 'started';
        this.stateId = Snowflake.generate();

        for (let player of Object.values(this.players)) {
            for (let actionListener in this.ActionListeners)
                player.socket.on(actionListener, (payload) => {
                    this.ActionListeners[actionListener](player, payload);
                });
        }

        this.nextEmberSpawnTime =
            new Date().getTime() +
            this.BASE_EMBER_SPAWN_TIME +
            Utils.randInt(-1000, 2000);

        console.log(`${this.id} started`);

        this._gameLoop(0);
    }

    _gameLoop(i) {
        if (i === 10) this.spawnFood(1);
        let gameUpdateEvent = new EmittableEvent('game', 'update');
        let gameEndedEvent = new EmittableEvent('game', 'ended');
        let playerEvents = new EmittableEvent('player', 'events');

        this.prevStateId = this.stateId;
        this.stateId = Snowflake.generate();

        let playerData = {};
        let playerEventsData = {};

        let currTime = new Date().getTime();

        //spawn embers
        if (currTime >= this.nextEmberSpawnTime) {
            this.shapeObstacles(0);
            playerEventsData['ember_spawn'] = true;
        }

        //convert primed embers to fire
        for (let y in this.embers) {
            for (let x in this.embers[y]) {
                ignite: if (currTime >= this.embers[y][x]) {
                    delete this.embers[y][x];

                    //if player on ember then extinguish
                    for (let player in this.players) {
                        let hitMap = this.players[player].game.hitMap;

                        if (hitMap[y]?.[x]) break ignite;
                    }

                    if (!this.obstacles[y]) this.obstacles[y] = {};
                    this.obstacles[y][x] = true;

                    playerEventsData['fire_ignite'] = true;
                }
            }
        }

        //move snakes & hit detect
        for (let player in this.players) {
            let playerId = player;

            //crashes if not removed
            let ePlayer = { ...this.players[playerId] };
            delete ePlayer.socket;

            gameUpdateEvent.addPlayers(this.players[player]);
            playerEvents.addPlayers(this.players[player]);

            player = this.players[player].game;
            if (player.snake.length === 0) continue;

            player.dir = player.tentativeDir;

            //min snake size
            if (player.snake.length < this.minPlayerLength)
                player.doGrow = true;

            let head = player.snake[player.snake.length - 1];

            let nextHead = [head[0] + player.dir[0], head[1] + player.dir[1]];
            player.snake.push(nextHead);

            let tail = null;
            if (!player.doGrow) {
                tail = player.snake.shift();
                delete player.hitMap[tail[1]]?.[tail[0]];
            }

            player.doGrow = false;

            //food eat detection
            let food = this.foods[nextHead[1]]?.[nextHead[0]];

            if (food) {
                player.doGrow = true;

                if (!playerEventsData['eat']) playerEventsData['eat'] = [];
                playerEventsData['eat'].push(ePlayer);

                if (food === 1) this.spawnFood(1);
            }
            delete this.foods[nextHead[1]]?.[nextHead[0]];

            //obstacle and player hit detection
            let didHit = this.obstacles[nextHead[1]]?.[nextHead[0]];

            if (!didHit)
                for (let _player in this.players)
                    didHit =
                        didHit ||
                        this.players[_player].game.hitMap[nextHead[1]]?.[
                            nextHead[0]
                        ];

            if (didHit) {
                this.playersAlive--;

                let possibleFoodSpawnLocs = [...player.snake];

                player.snake = [];
                player.hitMap = {};

                for (let loc of possibleFoodSpawnLocs)
                    if (Utils.randChoice([true, false, false]))
                        this.spawnFood(2, loc[0], loc[1]);

                if (!playerEventsData['death']) playerEventsData['death'] = [];
                playerEventsData['death'].push(ePlayer);

                for (let actionListener in this.ActionListeners)
                    this.players[playerId]?.socket.removeAllListeners(
                        this.ActionListeners[actionListener],
                    );
            }

            if (!player.hitMap[nextHead[1]]) player.hitMap[nextHead[1]] = {};
            player.hitMap[nextHead[1]][nextHead[0]] = true;

            playerData[playerId] = player;
        }

        gameUpdateEvent.setPayload({
            players: playerData,
            foods: this.foods,
            obstacles: this.obstacles,
            embers: this.embers,
            gameTick: this.stateId,
            prevGameTick: this.prevStateId,
        });

        gameUpdateEvent.emit();

        if (Object.keys(playerEventsData).length > 0) {
            playerEvents.setPayload(playerEventsData);
            playerEvents.emit();
        }

        if (this.playersAlive <= 1) {
            this.gameState = 'ended';

            for (let player in this.players) {
                player = this.players[player];

                gameEndedEvent.addPlayers(player);
                if (player.game.snake.length > 0)
                    gameEndedEvent.setPayload({
                        ...player.game,
                        uuid: player.uuid,
                    });
            }

            gameEndedEvent.emit();
            this.endGame(this.id);
        }

        if (this.gameState !== 'ended')
            setTimeout(() => {
                this._gameLoop(i + 1);
            }, this.TICK_SPEED);
    }

    spawnFood(type, x, y, attempt = 0) {
        if (attempt > 0 && x && y) return;

        let foodX = x || Utils.randInt(1, this.mapWidth - 2);
        let foodY = y || Utils.randInt(1, this.mapHeight - 2);

        if (this.obstacles[foodY]?.[foodX])
            return this.spawnFood(type, x, y, attempt + 1);
        for (let player in this.players) {
            let hitMap = this.players[player].game.hitMap;

            if (hitMap[foodY]?.[foodX])
                return this.spawnFood(type, x, y, attempt + 1);
        }

        if (!this.foods[foodY]) this.foods[foodY] = {};
        this.foods[foodY][foodX] = type;
    }

    shapeObstacles(attempt) {
        this.nextEmberSpawnTime =
            new Date().getTime() +
            this.BASE_EMBER_SPAWN_TIME +
            Utils.randInt(-1000, 2000);

        //stop after 6 failed attempts
        if (attempt === 6) return [];

        //select random ember shape and check for validity
        let selectedShape = Utils.randChoice(this.shapes);

        let maxX = this.mapWidth;
        let maxY = this.mapHeight;

        const topLeft = {
            x: Math.floor(Utils.randInt(1, maxX)),
            y: Math.floor(Utils.randInt(1, maxY)),
        };

        let res = [];

        let ignitionTime =
            new Date().getTime() +
            Utils.randInt(-2000, 2500) +
            this.BASE_IGNITION_TIME;

        let empty = 0;
        let total = 0;

        //validate blocks individually if not already fire or food
        for (let _y = 0; _y < selectedShape.length; _y++) {
            for (let _x = 0; _x < selectedShape[0].length; _x++) {
                let boardX = topLeft.x + _x;
                let boardY = topLeft.y + _y;

                total++;

                //if out of bounds, non ember, or space taken by non player entities skip
                if (selectedShape[_y][_x] === 0) {
                    empty++;
                    continue;
                }
                if (boardX < 0 || boardX > this.mapWidth - 1) continue;
                if (boardY < 0 || boardY > this.mapHeight - 1) continue;
                if (
                    this.obstacles[boardY]?.[boardX] ||
                    this.embers[boardY]?.[boardX] ||
                    this.foods[boardY]?.[boardX]
                )
                    continue;

                res.push([boardX, boardY]);
            }
        }

        if (res.length < Math.floor((total - empty) / 3))
            return this.shapeObstacles(attempt + 1);

        for (let ember of res) {
            if (!this.embers[ember[1]]) this.embers[ember[1]] = {};
            this.embers[ember[1]][ember[0]] = ignitionTime;
        }

        return res;
    }
};
