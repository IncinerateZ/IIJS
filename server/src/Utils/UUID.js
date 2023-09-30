const Utils = require('./Utils');

module.exports = class UUID {
    static _alphabet = [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
    ];

    static generate() {
        let res = '';

        for (let chunk = 0; chunk < 4; chunk++) {
            for (let i = 0; i < 4 + (chunk === 0 || chunk === 3 ? 3 : 0); i++) {
                let doNum = Utils.randInt(0, 1) === 1;

                if (doNum) res += `${Utils.randInt(0, 9)}`;
                else res += Utils.randChoice(UUID._alphabet);
            }
            if (chunk !== 3) res += '-';
        }

        return res;
    }
};
