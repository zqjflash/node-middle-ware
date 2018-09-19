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
        output += options.level.toUpperCae() + separ;

        if (meta && meta.hasOwnProperty('lineno')) {
            if (typeof meta.lineno === 'string' && meta.lineno !== '') {
                output += meta.lineno + separ;
            }
            delete meta.lineno;
        }

        if (meta) {
            if (meta instanceof Error && meta.stack) {
                meta = meta.stack;
            }

            if (typeof meta !== 'object') {
                output += separ + meta;
            } else if (Object.keys(meta).length > 0) {
                output += separ + common.serialize(meta);
            }
        }
        return output;
    };
};

exports.Simple = function(opt) {
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
        output += options.message;

        if (meta) {
            if (meta.hasOwnProperty('pid')) {
                delete meta.pid;
            }
            if (meta.hasOwnProperty('lineno')) {
                delete meta.lineno;
            }
            if (meta instanceof Error && meta.stack) {
                meta = meta.stack;
            }

            if (typeof meta !== 'object') {
                output += separ + meta;
            } else if (Object.keys(meta).length > 0) {
                output += separ + common.serialize(meta);
            }
        }
        return output;
    }
};
