'use strict';

const util = require('util');
const fs = require('fs');
const path = require('path');

const strftime = require('strftime');
const winston = require('winston');

const TmaBase = require('../tma-base');
const TmaDateFormat = require('../util/date-format');

const Formatter = require('../../lib/formatter');

const TmaDate = exports.TmaDate = function(options) {
    let instance = TmaBase.call(this, options);

    if (instance) {
        return instance;
    }
    this.options.concatStr = options.concatStr || '_';
    this.options.formatter = options.formatter || Formatter.Simple();
    this.options.format = options.format || TmaDateFormat.LogByDay;

    if (typeof this.options.format === 'function') {
        this.options.format = new this.options.format();
    }
};
util.inherits(TmaDate, TmaBase);

TmaDate.prototype.name = 'tmaDate';

TmaDate.prototype._checkfile = function(cb) {
    let now = new Date();
    let regenerate = true;
    let nowTime;

    if (this.options.format.name !== 'custom') {
        nowTime = parseInt(strftime(this.options.format.timePattern, now));
        if (this._lastTime && nowTime - this._lastTime < this.options.format.interval) {
            regenerate = false;
        } else {
            this._lastTime = nowTime;
        }
    }

    if (regenerate) {
        this.filename = path.join(this._dirname, this._basename + '_' + strftime(this.options.format.logPattern, now) + this._extname);
    }

    fs.stat(this.filename, (err, stats) => {
        if (err && err.code !== 'ENOENT') {
            cb(err);
            return;
        }
        cb();
    });
};
TmaDate.FORMAT = TmaDateFormat;
winston.transports.TmaDate = TmaDate;