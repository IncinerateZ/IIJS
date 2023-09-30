const Event = require('../Event');

module.exports = class PlayerEvent extends Event {
    constructor(player, type) {
        super('player', type);

        this.player = player;
    }
};
