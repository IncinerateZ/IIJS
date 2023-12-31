const EmittableEvent = require('../Events/EmittableEvent');
const PlayerPivot = require('../Events/PlayerEvents/PlayerPivot');
const Snowflake = require('../Utils/Snowflake');
const Utils = require('../Utils/Utils');

module.exports = class Game {
    constructor(id, dequeue, enqueue, enqueuePlayer, endGame) {
        // state management
        this.id = id;
        this.stateId = Snowflake.generate();
        this.prevStateId = -1;

        // game housekeeping functions
        this.dequeue = dequeue;
        this.enqueue = enqueue;
        this.endGame = endGame;
        this.enqueuePlayer = enqueuePlayer;

        this.forceStart = null;

        //matching, launching, started, ended
        this.gameState = 'matching';

        this.playersLoaded = 0;
        this.maxPlayers = 4;
        this.playersAlive = 0;

        this.players = {};
        this.foods = {};

        // dynamic snake colors
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

        //obstacles
        this.obstacle_shapes = [
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

        clearInterval(this.forceStart);

        player.gameId = this.id;
        player.ready = false;
        this.players[player.uuid] = player;

        //when 4 slots are filled then start and queue a new game
        if (Object.keys(this.players).length >= this.maxPlayers) {
            this.enqueue();
            if (this.gameState === 'matching') this.matchmake();
        }

        //after some time if at least 2 players are still queueing then start the game anyways
        if (Object.keys(this.players).length >= 2) {
            this.forceStart = setTimeout(() => {
                this.enqueue();
                if (this.gameState === 'matching') this.matchmake(true);
            }, 30000);
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

    matchmake(force) {
        clearInterval(this.forceStart);
        this.stateId = Snowflake.generate();

        let emitToAllEvent = new EmittableEvent();

        let duration = 10000;

        let currentStateId = this.stateId;
        let abort = setTimeout(() => {
            this.abortMatchmake(currentStateId);
        }, duration);

        let readyNum = 0;

        for (let player in this.players) {
            player = this.players[player];

            player.ready = false;
            emitToAllEvent.addPlayers(player);

            player.socket.on('player_ready', () => {
                console.log(`${player.uuid} ready`);
                player.ready = true;
                readyNum++;

                emitToAllEvent.setEvent('game', 'accepted');
                emitToAllEvent.setPayload({});
                emitToAllEvent.emit();

                this.initializeGame(emitToAllEvent, readyNum, force);
            });
        }

        emitToAllEvent.setEvent('game', 'matching');
        emitToAllEvent.setPayload({
            time: duration,
            playersReady: 0,
            playersCount: Object.keys(this.players).length,
            trigger: 'player_ready',
        });
        emitToAllEvent.emit();
    }

    initializeGame(emitToAllEvent, readyNum, force = false) {
        let numPlayers = Object.keys(this.players).length;

        // if not all players have readied return
        if (
            !(force && readyNum >= numPlayers) &&
            (numPlayers < this.maxPlayers || readyNum < numPlayers)
        )
            return false;

        this.stateId = Snowflake.generate();

        emitToAllEvent.setEvent('game', 'launching');
        emitToAllEvent.setPayload({
            trigger: 'player_load',
            listen: 'game_initialize',
        });

        emitToAllEvent.emit();

        this.dequeue(this.id);
        this.gameState = 'launching';

        //setup game world
        this._setup();

        //send world data
        emitToAllEvent.setEvent('game', 'initialize');
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

        //resend world init data after some time (redundant?)
        let initializeFallback = setInterval(() => {
            emitToAllEvent.setEvent('game', 'initialize');
            emitToAllEvent.setPayload(intializePayload);
            emitToAllEvent.emit();
        }, 10000);

        for (let player in this.players) {
            player = this.players[player];

            intializePayload.players[player.uuid] = player.game;

            //start the game when all players have finished loading
            player.socket.on('player_load', () => {
                console.log(player.uuid + ' Loaded');
                //start countdown
                this.playersLoaded++;

                if (this.playersLoaded >= Object.keys(this.players).length) {
                    clearInterval(initializeFallback);

                    let countdown = 4000;

                    emitToAllEvent.setType('countdown');
                    emitToAllEvent.setPayload({ time: countdown });
                    emitToAllEvent.emit();

                    setTimeout(() => {
                        //start game
                        this.startGame();
                    }, countdown);
                }
            });
        }
        emitToAllEvent.setPayload(intializePayload);
        emitToAllEvent.emit();

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

        // bind action listeners
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

        let emitToAllEvent = new EmittableEvent();

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

            emitToAllEvent.addPlayers(this.players[player]);

            //crashes if not removed
            let ePlayer = { ...this.players[playerId] };
            delete ePlayer.socket;

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

                //1 in 3 chance of dropping meat per snake length
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

        // send game data to clients every tick
        emitToAllEvent.setEvent('game', 'update');
        emitToAllEvent.setPayload({
            players: playerData,
            foods: this.foods,
            obstacles: this.obstacles,
            embers: this.embers,
            gameTick: this.stateId,
            prevGameTick: this.prevStateId,
        });
        emitToAllEvent.emit();

        if (Object.keys(playerEventsData).length > 0) {
            emitToAllEvent.setEvent('player', 'events');
            emitToAllEvent.setPayload(playerEventsData);
            emitToAllEvent.emit();
        }

        // win check
        if (this.playersAlive <= 1) {
            this.gameState = 'ended';

            emitToAllEvent.setEvent('game', 'ended');
            for (let player in this.players) {
                player = this.players[player];

                if (player.game.snake.length > 0)
                    emitToAllEvent.setPayload({
                        ...player.game,
                        uuid: player.uuid,
                    });
            }
            emitToAllEvent.emit();

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
        let selectedShape = Utils.randChoice(this.obstacle_shapes);

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
