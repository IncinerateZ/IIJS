module.exports = class Utils {
    // random int : [min, max]
    static randInt(min, max) {
        return Math.floor(Math.random() * (max + 1 - min) + min);
    }

    static randChoice(array) {
        return array[Utils.randInt(0, array.length - 1)];
    }
};
