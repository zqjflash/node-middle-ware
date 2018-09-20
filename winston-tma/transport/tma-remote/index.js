'use strict';

const util = require('util');
const assert = require('assert');

const strftime = require('strftime');
const TmaStream = require('tma-stream');
const TmaClient = require('tma-rpc').client;
const TmaConfigure = require('tma-config-parser');

const winston = require('winston');
const common = require('winston/lib/winston/common');

const LogProxy = require('./LogProxy');
const TmaDateFormat = require('../util/date-format');

const Formatter = require('../../lib/formatter');
const emptyfn = function() {};

const TmaRemote = function(options) {
    let tmaConfig;
    options = options || {};
    winston.Transport.call(this, options);
    assert(options.tmaConfig || process.env.TMA_CONFIG, 'TMA_CONFIG is not in env and options. tmaConfig not defined');
    if (options.tmaConfig instanceof TmaConfigure) {
        tmaConfig = options.tmaConfig;
    } else {
        tmaConfig = new TmaConfigure();
        if (typeof options.tmaConfig === 'string') {
            tmaConfig.parseFile(options.tmaConfig);
        } else if (process.env.TMA_CONFIG) {
            tmaConfig.parseFile(process.env.TMA_CONFIG);
        }
    }

    assert(tmaConfig, 'options.tmaConfig not instanceof tma-rpc.util.configure');
    assert(tmaConfig.get('tma.application.server.app') &&
        tmaConfig.get('tma.application.server.server'), 'app & server not found configure file');

    this._logInfo = new LogProxy.tma.LogInfo();
    this._logInfo.appname = tmaConfig.get('tma.application.server.app');
    this._logInfo.servername = tmaConfig.get('tma.application.server.server');

    if (options.filename) {
        this._logInfo.sFilename = options.filename;
    }

    options.format = options.format || TmaDateFormat.LogByDay;
    if (typeof options.format === 'function') {
        options.format = new options.format;
    }

    assert(options.format.name === 'day' ||
        options.format.name === 'hour' ||
        options.format.name === 'minute', 'options.format MUST be among [day|hour|minute]'
    );

    this._logInfo.sFormat = options.format.logPattern;
    this._logInfo.sLogType = options.format.interval + options.format.name;

    if (tmaConfig.get('tma.application.enableset', 'n').toLowerCase() === 'y' &&
        tmaConfig.get('tma.application.setdivision', 'NULL') !== 'NULL') {
        this._logInfo.setdivision = tmaConfig.get('tma.application.setdivision');
    }

    if (typeof options.hasSufix === 'boolean') {
        this._logInfo.bHasSufix = options.hasSufix;
    }

    if (typeof options.hasAppNamePrefix === 'boolean') {
        this._logInfo.bHasAppNamePrefix = options.hasAppNamePrefix;
    }

    if (typeof options.concatStr === 'string') {
        this._logInfo.sConcatStr = options.concatStr;
    }

    if (typeof options.separ === 'string') {
        this._logInfo.sSepar = options.separ;
    }

    if (typeof options.tmaConfig === 'string') {
        TmaClient.initialize(options.tmaConfig);
    }

    this._client = TmaClient.stringToProxy(LogProxy.tma.LogProxy,
        tmaConfig.get('tma.application.server.log', 'tma.tmalog.LogObj')
    );

    this.options = {
        interval: options.interval || 500, // 500ms
        bufferSize: options.bufferSize || 10000,
        prefix: options.prefix,
        formatter: options.formatter || Formatter.Detail({
            separ: this._logInfo.sSepar
        })
    };

    this._buffer = [];
    this._bufferIndex = 0;
};
util.inherits(TmaRemote, winston.Transport);

TmaRemote.prototype.name = 'tmaRemote';

TmaRemote.prototype.log = function(level, msg, meta, callback) {
    let ths = this;

    let output = common.log({
        level: level,
        message: msg,
        meta: meta,
        formatter: this.options.formatter,
        prefix: this.options.prefix
    }) + '\n';

    this._buffer[this._bufferIndex++] = {
        output: output,
        callback: callback
    };

    if (this._bufferIndex > this.options.bufferSize) {
        this._bufferIndex = 0;
    }

    if (!this._timerid) {
        this._timerid = setTimeout(() => {
            ths._flush();
            delete ths._timerid;
        }, this.options.interval);
    }
};

TmaRemote.prototype._flush = function() {
    let buffer = new TmaStream.List(TmaStream.String);
    let i = 0;
    for (i = this._bufferIndex; i < this._buffer.length; i += 1) {
        buffer.push(this._buffer[i].output);
        this._buffer[i].callback(null, true);
    }
    for (i = 0; i < this._bufferIndex; i += 1) {
        buffer.push(this._buffer[i].output);
        this._buffer[i].callback(null, true);
    }

    this._bufferIndex = 0;
    this._buffer = [];

    this._client.loggerbyInfo(this._logInfo, buffer).catch(emptyfn);
};

TmaRemote.prototype.close = function() {
    if (this._timerid) {
        clearTimeout(this._timerid);
        delete this._timerid;
    }

    this._buffer = [];
    this._bufferIndex = 0;

    this._client.disconnect();
};

TmaRemote.FORMAT = TmaDateFormat;

module.exports = winston.transports.TmaRemote = TmaRemote;
