const PlayerEvent = require('./PlayerEvent');

module.exports = class PlayerPivot extends PlayerEvent {
    constructor(player, vector) {
        super(player, 'pivot');

        if (this.isReverseDirection(vector, player.game.dir)) return;
        player.game.tentativeDir = vector;
    }

    isReverseDirection(dir1, dir2) {
        return dir1[0] === dir2[0] * -1 && dir1[1] === dir2[1] * -1;
    }
};
