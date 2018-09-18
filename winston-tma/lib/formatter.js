'use strict';

const common = require('winston/lib/winston/common');
const strftime = require('strftime');

exports.Detail = (opt) => {
    let separ = '|';
    opt = opt || {};
    if (opt.separ) {
        separ = opt.separ;
    }

    return function(options) {
        let meta = options.meta;
        let output = '';

        if (options.prefix) {
            output += options.prefix + separ;
        }

        output += strftime('%Y-%m-%d %H:%M:%S') + separ;

        if (meta && meta.pid) {
            output += meta.pid + separ;
            delete meta.pid;
        } else {
            output += process.pid + separ;
        }
        
    }
};
