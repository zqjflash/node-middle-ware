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