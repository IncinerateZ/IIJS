module.exports = class Snowflake {
    static _timestamp = -1;
    static _count = 1;
    static generate() {
        let now = new Date().getTime();

        if (now !== Snowflake._timestamp) {
            Snowflake._timestamp = now;
            Snowflake._count = 1;
        }

        return now * 1000 + Snowflake._count++;
    }
};
