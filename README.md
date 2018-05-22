# loopback-connector-gdatastore
Google Cloud Platform DataStore connector for loopback

###Disclaimer:
This is a forked version of loopback-connector-gdatastore

## Installation

    npm install loopback-connector-gcp-datastore --save

## Setup datasources.json
```json
  "gdatastore": {
    "name": "gdatastore",
    "connector": "loopback-connector-gcp-datastore",
    "projectId": "gcloud-project-id",
    "namespace": "datastore-namespace"
  }
```

## Setup model-config.json
```json
  "options": {
    "remoting": {
      "sharedMethods": {
        "*": false,
        "find": true,
        "create": true,
        "findById": true,
        "deleteById": true,
        "replaceById": true,
        "prototype.patchAttributes": true
      }
    }
  }
```

## To support relations in order to create Key references in datastore
*Add the following configuration to your model*
```json
  "properties": {
    ...
    "parent": {
      "type": "string",
      "required": true
    }
  },
  "relations": {
    "parentEntity": {
      "model": "parentEntityModel",
      "foreignKey": "parent",
      "type": "belongsTo"
    }
  }
```

## Currently working operations
    find, findById, create, updateAttributes, replaceById, deleteById

## Currently filtering operators
    and

## Support for eq, gt, gte, lt & lte