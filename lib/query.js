var debug = require('debug')('loopback:connector:gdatastore');
const Datastore = require('@google-cloud/datastore');
const _ = require('./util');

module.exports = Query;

function Query(ds, model, idName, definition) {
    this.ds = ds;
    this.model = model;
    this.idName = idName;
    this.definition = definition;
    this.query = ds.createQuery(model);
}

Query.prototype.filter = function (filters) {
    let ds = this.ds;
    // Where clauses (including conditions on primary key)
    if (filters !== undefined && filters.where !== undefined) {
        _.forin(filters.where, (val, key) => {
            this.where(val, key);
        });
    }
    // Limit restriction
    if (undefined !== filters.limit) {
        debug('find: adding limit %d', filters.limit);
        this.query.limit(filters.limit);
    }
    // Offset restriction
    if (undefined !== filters.offset) {
        debug('find: adding offset %d', filters.offset);
        this.query.offset(filters.offset);
    }
};

Query.prototype.where = function (data, name) {
    data = data === undefined || data === null ? "" : data;
    // How to handle?
    if (this.idName == name) {
        debug('find: adding filter by __key__ = %s', data);
        let key = this.ds.key([this.model, data]);
        this.query.filter('__key__', '=', key);
    } else if ('and' === name) {
        _.forin(data, (val, key) => {
            this.where(val, key);
        });
    } else if ('or' === name) {
        debug('find: UNSUPPORTED OR %s', JSON.stringify(data));
    } else {
        debug('find: adding filter %s = %s', name, JSON.stringify(data));

        var op = '=';
        if (data.gt) op = '>';
        if (data.gte) op = '>=';
        if (data.lt) op = '<';
        if (data.lte) op = '<=';
        if (op !== '=') data = data[Object.keys(data)[0]];

        this.mapRelations(name, (relation) => {
            data = this.ds.key([relation.model, data]);
        });
        this.query.filter(name, op, data);
    }
};

Query.prototype.select = function (callback) {
    this.ds.runQuery(this.query, (error, result, cursor) => {
        if (result.length > 0) {
            result = result.map((entity) => {
                let key = entity[Datastore.KEY];
                entity[this.idName] = key[this.idName];
                _.forin(entity, (value, name) => {
                    this.mapRelations(name, (relation) => {
                        value = value['id'] || value['name'];
                    });
                    entity[name] = value;
                });
                return entity;
            });
        }
        callback(error, result);
    });
};

Query.prototype.findById = function (id, callback) {
    let filter = { where: {}, limit: 1 };
    filter.where[this.idName] = id;
    this.filter(filter);
    this.select((errors, result) => {
        if (errors) {
            return callback(errors);
        }
        callback(null, (result != null && result.length)
            ? result[0] : undefined);
    });
};

Query.prototype.create = function (data, callback) {
    var id = data[this.idName];
    var key;
    if (id) {
        debug('create: using preset: %s %s', this.idName, id);
        key = this.ds.key([this.model, id]);
    } else {
        debug('create: no id found on %s, will be auto-generated on insert', this.idName);
        key = this.ds.key(this.model);
    }
    data = this.toDatastoreFormat(data);
    this.ds.save({
        key: key,
        data: data
    }, (errors, result) => {
        if (errors) {
            return callback(errors);
        }
        if (!key.path && !key.path[1]) {
            var err = new Error('Datastore error: missing key.path');
            return callback(err);
        }
        callback(null, key.path[1]);
    });
};

Query.prototype.update = function (id, data, callback) {
    this.findById(id, (error, entity) => {
        if (error) {
            return callback(error);
        }
        let _data = _.mergewith(entity, data, (obj, src) => {
            if (_.isarray(obj)) {
                return src;
            }
        });
        _data = this.toDatastoreFormat(_data);
        let key = this.ds.key([this.model, id]);
        this.ds.update({
            key: key,
            data: _data
        }, (errors, result) => {
            if (errors) {
                return callback(errors);
            }
            callback(null, id);
        });
    });
}

Query.prototype.deleteById = function (id, callback) {
    let key = this.ds.key([this.model, id]);
    this.ds.delete(key, (errors, result) => {
        if (errors) {
            return callback(errors);
        }
        callback(null, id);
    });
}

// Convert to a proper DB format, with indexes off as needed
Query.prototype.toDatastoreFormat = function (data) {
    // removes __key__ from collection
    delete data[this.idName];

    var properties = this.definition.properties;
    return _.map(data, (value, name) => {
        var excluded;
        var property = properties[name];
        if (!property) {
            excluded = true;
            if (this.definition.settings.strict) {
                return undefined;
            }
        } else {
            excluded = property.index === false;
            this.mapRelations(name, (relation) => {
                value = this.ds.key([relation.model, value]);
            });
        }
        return {
            name: name,
            value: value,
            excludeFromIndexes: excluded
        };
    });
};

Query.prototype.mapRelations = function (property, callback) {
    var relations = this.definition.settings.relations;
    if (relations) {
        _.forin(relations, (val) => {
            if (val.foreignKey === property &&
                val.type == 'belongsTo') {
                callback(val);
            }
        });
    }
}