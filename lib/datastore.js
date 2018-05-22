const debug = require('debug')('loopback:connector:gdatastore');
const Connector = require('loopback-connector').Connector;
const Datastore = require('@google-cloud/datastore');
const assert = require('assert');
const util = require('util');

module.exports = GDataStore;

//Create an instance of the connector with the given `settings`.
function GDataStore(settings) {
    assert(typeof settings === 'object', 'cannot initiaze ' +
        'GDataStore without a settings object');
    Connector.call(this, 'gdatastore', settings);
    this.datastore = Datastore({
        projectId: settings.projectId,
        namespace: settings.namespace
    });
}

// Set up the prototype inheritence
util.inherits(GDataStore, Connector);

GDataStore.initialize = function (dataSource, callback) {
    dataSource.connector = new GDataStore(dataSource.settings);
    dataSource.connector.connect();
    process.nextTick(callback);
};

GDataStore.prototype.relational = false;

GDataStore.prototype.createQuery = function (model, callback) {
    const Query = require('./query');
    const ds = this.datastore;
    const idName = this.idName(model);
    const definition = this.getModelDefinition(model);
    callback(new Query(ds, model, idName, definition));
};

GDataStore.prototype.callback = function (errors, result, callback) {
    if (callback === null || callback === undefined) {
        return;
    }
    if (errors) {
        return callback(errors);
    }
    callback(null, result);
};

GDataStore.prototype.connect = function (callback) {
    if (callback) { callback(); }
};

GDataStore.prototype.disconnect = function (callback) {
    if (callback) { callback(); }
};

GDataStore.prototype.all = function (model, filter, callback) {
    this.find(model, filter, callback);
};

GDataStore.prototype.find = function (model, filter, callback) {
    debug('finding: %s %s', model, JSON.stringify(filter));
    this.createQuery(model, (query) => {
        query.filter(filter);
        query.select((errors, result, cursor) => {
            this.callback(errors, result, callback);
        });
    });
};

GDataStore.prototype.findById = function (model, id, callback) {
    debug('finding: %s by id %s', model, id);
    this.createQuery(model, (query) => {
        query.findById(id, (errors, result) => {
            this.callback(errors, result, callback);
        });
    });
};

GDataStore.prototype.create = function (model, data, options, callback) {
    debug('create: %s %s %s', model, JSON.stringify(data),
        JSON.stringify(options));
    assert(data, 'Cannot save an empty entity into the database');
    this.createQuery(model, (query) => {
        debug('create: executing %s', JSON.stringify(data));
        query.create(data, (errors, result) => {
            this.callback(errors, result, callback);
        });
    });
};

GDataStore.prototype.updateAttributes = function (model, id, data, options, callback) {
    debug('updateAttributes: %s %s %s %s', model, id, JSON.stringify(data),
        JSON.stringify(options));
    assert(id, 'Cannot update an entity without an existing id');
    this.createQuery(model, (query) => {
        query.update(id, data, (errors, result) => {
            this.callback(errors, result, callback);
        });
    });
};

GDataStore.prototype.replaceById = function (model, id, data, options, callback, v) {
    debug('replaceById: %s %s %s %s', model, id, JSON.stringify(data),
        JSON.stringify(options));
    assert(id, 'Cannot update an entity without an existing id');
    this.createQuery(model, (query) => {
        query.update(id, data, (errors, result) => {
            this.callback(errors, result, callback);
        });
    });
};

GDataStore.prototype.destroyAll = function (model, filter, options, callback) {
    debug('destroyAll: %s %s %s %s', model, JSON.stringify(filter),
        JSON.stringify(options));
    assert(filter, 'Cannot delete an entity without a filter');
    this.createQuery(model, (query) => {
        let id = filter[this.idName(model)];
        query.deleteById(id, (errors, result) => {
            this.callback(errors, result, callback);
        });
    });
};