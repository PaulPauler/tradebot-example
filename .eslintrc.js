module.exports = {
    "parser": "babel-eslint",
    "env": {
        "es6": true,
        "node": true,
        "jquery": true,
        "browser": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 2017,
        "experimentalObjectRestSpread": true
    },
    "rules": {
        "indent": "off",
        "linebreak-style": [
            "error",
            "unix"
        ],
        "semi": [
            "warn",
            "always"
        ],
        "no-console": "off",
        "no-unused-vars": "off"
    }
};
