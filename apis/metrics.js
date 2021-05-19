var APIBuilder = require('@axway/api-builder-runtime');

var shortNumber = require('short-number');

let lib = require('../aclib');
let config = require('../acconfig');

function sendResponse(statusCode, response, req, resp, next) {
	console.log('sendResponse() called');

	resp.response.status(statusCode);
	resp.send(response);
	next();
}

function errorRate(options, req, resp, next) {
	console.log('errorRate() called');

	let totalNumAPICalls = 0;
	let numFailedCalls = 0;

	lib.init(options.clientId, options.clientSecret, options.apiCentralBaseURL, function(e) {
		if(e.success) {
			lib.numFailedAPICalls(req.params.pid, req.params.eid, function(transactionSearchResult) {
				if(transactionSearchResult.success) {
					numFailedCalls = transactionSearchResult.data

					lib.totalNumAPICalls(req.params.pid, req.params.eid, function(transactionSearchResult2) {
						if(transactionSearchResult2.success) {
							totalNumAPICalls = transactionSearchResult2.data

							let errorRate = "0";

							if(totalNumAPICalls > 0) {
								errorRate = 100*(numFailedCalls/totalNumAPICalls);
								errorRate = Number.parseFloat(errorRate).toFixed(1).toString()
							}

							var response = {
								"schemaVersion": 1,
								"label": "Err Rate",
								"message": errorRate.toString()+'%',
								"color": "red"
							}

							sendResponse(200, response, req, resp, next)

						} else {
							console.log('Error with Transaction Search - total num calls!')

							sendResponse(400, 'Error with Transaction Search - total num calls!', req, resp, next)

						}
					})

				} else {
					console.log('Error with Transaction Search - num failed calls!')

					sendResponse(400, 'Error with Transaction Search - num failed calls!', req, resp, next)

				}
			})
		} else {
			console.log(tokenErrorMsg)

			sendResponse(400, tokenErrorMsg, req, resp, next)
		}
	});

}

function totalNumAPICalls(options, req, resp, next) {
	console.log('totalNumAPICalls() called');

	let totalNumAPICalls = 0;

	lib.init(options.clientId, options.clientSecret, options.apiCentralBaseURL, function(e) {
		if(e.success) {
			lib.totalNumAPICalls(req.params.pid, req.params.eid, function(transactionSearchResult) {
				if(transactionSearchResult.success) {
					totalNumAPICalls = transactionSearchResult.data

					var response = {
						"schemaVersion": 1,
						"label": "Total # Calls",
						"message": shortNumber(totalNumAPICalls).toString(),
						"color": "green"
					}

					sendResponse(200, response, req, resp, next)

				} else {
					console.log('Error with Transaction Search!')

					sendResponse(400, 'Error with Transaction Search!', req, resp, next)

				}
			})
		} else {
			console.log(tokenErrorMsg)

			sendResponse(400, tokenErrorMsg, req, resp, next)
		}
	});

}

function avgResponseTime(options, req, resp, next) {
	console.log('avgResponseTime() called');

	lib.init(options.clientId, options.clientSecret, options.apiCentralBaseURL, function(e) {
		if(e.success) {
			lib.avgAPIResponseTime(req.params.pid, req.params.eid, function(transactionSearchResult) {
				if(transactionSearchResult.success) {

					let avgAPIResponseTime = 0;

					if(transactionSearchResult.data) {
							avgAPIResponseTime = transactionSearchResult.data
					}

					var response = {
						"schemaVersion": 1,
						"label": "Avg Resp Time",
						"message": Number.parseFloat(avgAPIResponseTime).toFixed(1).toString()+'ms',
						"color": "blue"
					}

					sendResponse(200, response, req, resp, next)

				} else {
					console.log('Error with Transaction Search!')

					sendResponse(400, 'Error with Transaction Search!', req, resp, next)

				}
			})
		} else {
			console.log(tokenErrorMsg)

			sendResponse(400, tokenErrorMsg, req, resp, next)
		}
	});

}

var metrics = APIBuilder.API.extend({
	group: 'webhook',
	path: '/api/metrics',
	method: 'GET',
	description: 'API to retrieve API metrics for a shields.io badge',
	parameters: {
		metrictype: {
			type: 'query',
			description: 'Type of metric (totalnumcalls, avgresptime, errorrate)',
			optional: false
		},eid: {
			type: 'query',
			description: 'Environment ID of the API',
			optional: false
		},
		pid: {
			type: 'query',
			description: 'Proxy ID of the API',
			optional: false
		}
	},
	action: function (req, resp, next) {

		console.log('metrics API called')

		let options = {
		  clientId: config.clientId,
		  clientSecret: config.clientSecret,
		  apiCentralBaseURL: config.apiCentralBaseURL
		}

		switch(req.params.metrictype) {
			case 'totalnumcalls':
				totalNumAPICalls(options, req, resp, next);
				break;
			case 'avgresptime':
				avgResponseTime(options, req, resp, next);
				break;
			case 'errorrate':
				errorRate(options, req, resp, next);
				break;
			default:
				{
					console.log('Unknown metric type requested');

					sendResponse(400, 'Unknown metric type requested!', req, resp, next)
				}
		}


	}
});

module.exports = metrics;
