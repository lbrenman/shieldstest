let debugConsoleLog = true;

const qs = require('qs')
const axios = require('axios');

var _apiCentralBaseURL, _accessToken;
var initCalled = false;

module.exports = {
  init: init,
  getApiServicesForEnvironmentName: getApiServicesForEnvironmentName,
  delApiServicesForEnvironmentName: delApiServicesForEnvironmentName,
  getCatalogItems: getCatalogItems,
  getCatalogItemsForEnvironmentName: getCatalogItemsForEnvironmentName,
  getEnvironments: getEnvironments,
  getSubscriptions: getSubscriptions,
  getOpenSubscriptions: getOpenSubscriptions,
  getWebhooksByEnvironment: getWebhooksByEnvironment,
  getSubscriptions: getSubscriptions,
  updateSubscriptionWebhookURL: updateSubscriptionWebhookURL,
  updateAPIService: updateAPIService,
  totalNumAPICalls: totalNumAPICalls,
  avgAPIResponseTime: avgAPIResponseTime,
  envAvgAPIResponseTime: envAvgAPIResponseTime,
  numFailedAPICalls: numFailedAPICalls,
  numAPICallsPerStatus: numAPICallsPerStatus,
  envNumAPICallsPerStatus: envNumAPICallsPerStatus
}

function consoleLog(str) {
  if(debugConsoleLog){console.log(str)}
}

function init(clientId, clientSecret, apiCentralBaseURL, callback) {
  consoleLog('init()')

  _apiCentralBaseURL = apiCentralBaseURL;

  getToken(clientId, clientSecret, function(response) {
    if(response.success) {
      consoleLog(response.data);
      _accessToken = response.data.access_token;
      initCalled = true;
      if(callback){callback({success:true})}
    } else {
      consoleLog('Token error: '+response.data);
      if(callback){callback({success:false, data:'Token error: '+response.data})}
    }
  });
}

function getAxiosOptions(method, url, accessToken) {
  consoleLog('getAxiosOptions()')

  return {
    method: method,
    url: url,
    headers: {
      'Authorization': 'Bearer ' + _accessToken,
      'content-type': 'application/json'
    }
  }
}

function callAxios(options, callback) {
  consoleLog('callAxios()')

  // consoleLog(options)

  axios(options, callback)
    .then(function (response) {
      // consoleLog(response)
      if(callback){callback({success: true, data:response.data});}
    })
    .catch(function (error) {
      // consoleLog(error)
      if(callback){callback({success: false, data:error});}
    });
}

function getToken(clientId, clientSecret, callback) {
  consoleLog('getToken()')

  // https://flaviocopes.com/axios-urlencoded/
  axios({
    method: 'post',
    url: 'https://login.axway.com/auth/realms/Broker/protocol/openid-connect/token',
    data: qs.stringify({
      grant_type: 'client_credentials'
    }),
    headers: {
      'Authorization': 'Basic '+Buffer.from(clientId + ':' + clientSecret, 'utf8').toString('base64'), // https://nodejs.org/docs/latest/api/buffer.html
      'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
    }
  })
    .then(function (response) {
      if(callback){callback({success: true, data:response.data});}
    })
    .catch(function (error) {
      if(callback){callback({success: false, data:error});}
    });
}

function checkInitCalled(initCalled, callback) {
  if(!initCalled) {
    if(callback){callback({success: false, data: 'init() not called. Call init() before making any calls'})}
    return false
  } else {
    return true
  }
}

function makeApiCall(verb, data, path, name, callback) {
  consoleLog('makeApiCall()');
  consoleLog(name);
  consoleLog(verb);
  consoleLog(JSON.stringify(data));
  consoleLog(path);

  if(checkInitCalled(initCalled, callback)) {
    let options = getAxiosOptions(verb, _apiCentralBaseURL + path, _accessToken);
    if(verb === 'POST' || verb === 'PUT') {
      options.data = data;
    }
    callAxios(options, callback);
  }
}

function getCatalogItems(callback) {
  makeApiCall('GET', {}, `/api/unifiedCatalog/v1/catalogItems`,'getCatalogItems()',callback)
}

function getCatalogItemsForEnvironmentName(envName, callback) {
  makeApiCall('GET', {}, `/api/unifiedCatalog/v1/catalogItems/?query=relationships.type==API_SERVER_ENVIRONMENT_NAME;relationships.value==${envName}`,'getCatalogItemsForEnvironmentName()',callback)
}

function getApiServicesForEnvironmentName(envName, callback) {
  makeApiCall('GET', {}, `/apis/management/v1alpha1/environments/${envName}/apiservices`,'getApiServicesForEnvironmentName()',callback)
}

function delApiServicesForEnvironmentName(envName, serviceName, callback) {
  makeApiCall('DELETE', {}, `/apis/management/v1alpha1/environments/${envName}/apiservices/${serviceName}`,'getApiServicesForEnvironmentName()',callback)
}

function getEnvironments(callback) {
  makeApiCall('GET', {}, `/apis/management/v1alpha1/environments`,'getEnvironments()',callback)
}

function getSubscriptions(callback) {
  makeApiCall('GET', {}, `/api/unifiedCatalog/v1/subscriptions`,'getSubscriptions()',callback)
}

function getOpenSubscriptions(callback) {
  makeApiCall('GET', {}, `/api/unifiedCatalog/v1/subscriptions?query=state==REQUESTED`,'getOpenSubscriptions()',callback)
}

function getWebhooksByEnvironment(envName, callback) {
  makeApiCall('GET', {}, `/apis/management/v1alpha1/environments/${envName}/webhooks`,'getWebhooksByEnvironment()',callback)
}

function getSubscriptions(callback) {
  makeApiCall('GET', {}, `/api/unifiedCatalog/v1/subscriptions`,'getSubscriptions()',callback)
}

function updateSubscriptionWebhookURL(envName, url, callback) {

  let data = {
    "name": "subscriptionwebhook",
    "title": "subscriptionwebhook",
    "spec": {
      "auth": {
        "secret": {
          "name": "subscriptionwebhook",
          "key": "webhookAuthKey"
        }
      },
      "enabled": true,
      "url": url,
      "headers": {}
    }
  }

  makeApiCall('PUT', data, `/apis/management/v1alpha1/environments/${envName}/webhooks/subscriptionwebhook`,'updateSubscriptionWebhookURL()',callback)
}

function updateAPIService(url, data, callback) {

  makeApiCall('PUT', data, url,'updateAPIService()',callback)
}

function traceabilitySearch(data, callback) {

  let url = '/api/traceability/v1/traceability/search';

  makeApiCall('POST', data, url,'traceabilitySearch()',callback)
}

function avgAPIResponseTime(proxyId, environmentId, callback) {

  let now = new Date();

  let data = {
    "filters": {
      "$and": [
        {
          "$match": {
            "type": [
              "transactionSummary"
            ]
          }
        },
        {
          "$match": {
            "transactionSummary.proxy.id": [
              proxyId
            ]
          }
        },
        {
          "$match": {
            "environmentId": [
              environmentId
            ]
          }
        }
      ],
      "$range": {
        "@event_time": {
          "gt": 0,
          "lt": now.getTime()
        }
      }
    },
    "invoke": {
      "field": "transactionSummary.duration",
      "method": "avg"
    },
    "version": "0.2"
  }

  traceabilitySearch(data, callback)
}

function envAvgAPIResponseTime(environmentId, callback) {

  let now = new Date();

  let data = {
    "filters": {
      "$and": [
        {
          "$match": {
            "type": [
              "transactionSummary"
            ]
          }
        },
        {
          "$match": {
            "environmentId": [
              environmentId
            ]
          }
        }
      ],
      "$range": {
        "@event_time": {
          "gt": 0,
          "lt": now.getTime()
        }
      }
    },
    "invoke": {
      "field": "transactionSummary.duration",
      "method": "avg"
    },
    "version": "0.2"
  }

  traceabilitySearch(data, callback)
}

function totalNumAPICalls(proxyId, environmentId, callback) {

  let now = new Date();

  let data = {
    "filters": {
      "$and": [
        {
          "$match": {
            "type": [
              "transactionSummary"
            ]
          }
        },
        {
          "$match": {
            "transactionSummary.proxy.id": [
              proxyId
            ]
          }
        },
        {
          "$match": {
            "environmentId": [
              environmentId
            ]
          }
        }
      ],
      "$range": {
        "@event_time": {
          "gt": 0,
          "lt": now.getTime()
        }
      }
    },
    "invoke": {
      "field": "@event_time",
      "method": "count"
    },
    "version": "0.2"
  }

  traceabilitySearch(data, callback)
}

function numFailedAPICalls(proxyId, environmentId, callback) {

  let now = new Date();

  let data = {
    "filters": {
      "$and": [
        {
          "$match": {
            "type": [
              "transactionSummary"
            ]
          }
        },
        {
          "$match": {
            "transactionSummary.proxy.id": [
              proxyId
            ]
          }
        },
        {
          "$match": {
            "environmentId": [
              environmentId
            ]
          }
        },
        {
          "$match": {
            "transactionSummary.status": [
              "Failure"
            ]
          }
        }
      ],
      "$range": {
        "@event_time": {
          "gt": 0,
          "lt": now.getTime()
        }
      }
    },
    "invoke": {
      "field": "@event_time",
      "method": "count"
    },
    "version": "0.2"
  }

  traceabilitySearch(data, callback)
}

function numAPICallsPerStatus(proxyId, environmentId, callback) {

  let now = new Date();

  let data = {
    "filters": {
      "$and": [
        {
          "$match": {
            "type": [
              "transactionSummary"
            ]
          }
        },
        {
          "$match": {
            "transactionSummary.proxy.id": [
              proxyId
            ]
          }
        },
        {
          "$match": {
            "environmentId": [
              environmentId
            ]
          }
        }
      ],
      "$range": {
        "@event_time": {
          "gt": 0,
          "lt": now.getTime()
        }
      }
    },
    "invoke": {
      "field": "@event_time",
      "method": "count"
    },
    "group_by": [
      {
        "field": "transactionSummary.status",
        "type": "string"
      }
    ],
    "version": "0.2"
  }

  traceabilitySearch(data, callback)
}

function envNumAPICallsPerStatus(environmentId, callback) {

  let now = new Date();

  let data = {
    "filters": {
      "$and": [
        {
          "$match": {
            "type": [
              "transactionSummary"
            ]
          }
        },
        {
          "$match": {
            "environmentId": [
              environmentId
            ]
          }
        }
      ],
      "$range": {
        "@event_time": {
          "gt": 0,
          "lt": now.getTime()
        }
      }
    },
    "invoke": {
      "field": "@event_time",
      "method": "count"
    },
    "group_by": [
      {
        "field": "transactionSummary.status",
        "type": "string"
      }
    ],
    "version": "0.2"
  }

  traceabilitySearch(data, callback)
}
