const Event = require('./Event');

module.exports = class EmittableEvent extends Event {
    constructor(entity, type) {
        super(entity, type);

        this.players = [];
        this.payload = {};
    }

    setEvent(entity, type) {
        this.entity = entity;
        this.type = type;
    }

    setEntity(entity) {
        this.entity = entity;
    }

    setType(type) {
        this.type = type;
    }

    addPlayers(...players) {
        this.players = [...this.players, ...players];
    }

    setPayload(payload) {
        this.payload = payload;
    }

    emit() {
        for (let player of this.players)
            player.socket.emit(`${this.entity}_${this.type}`, this.payload);
    }
};
