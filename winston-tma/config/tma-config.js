'use strict';

const config = require('winston/lib/winston/config');
const tmaConfig = exports;

tmaConfig.levels = {
    info: 4,
    debug: 3,
    warn: 2,
    error: 1,
    none: 0
};

tmaConfig.colors = {
    info: 'white',
    debug: 'cyan',
    warn: 'yellow',
    error: 'red',
    none: 'grey'
};

config.tma = tmaConfig;
config.addColors(config.tma.colors);