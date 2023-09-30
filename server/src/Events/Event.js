const Snowflake = require('../Utils/Snowflake');

module.exports = class Event {
    constructor(entity, type) {
        this.id = Snowflake.generate();
        this.type = type;
        this.entity = entity;
    }
};
