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

function envCallMetrics(options, req, resp, next) {
	console.log('envCallMetrics() called');

	lib.init(options.clientId, options.clientSecret, options.apiCentralBaseURL, function(e) {
		if(e.success) {
			lib.envNumAPICallsPerStatus(req.params.eid, function(transactionSearchResult) {
				if(transactionSearchResult.success) {

					console.log(transactionSearchResult.data)

					let failures = 0;
					let successes = 0;
					let exceptions = 0;

					if(transactionSearchResult.data.hasOwnProperty('Success')) {
						successes = transactionSearchResult.data.Success;
					}

					if(transactionSearchResult.data.hasOwnProperty('Failure')) {
						failures = transactionSearchResult.data.Failure;
					}

					if(transactionSearchResult.data.hasOwnProperty('Exception')) {
						exceptions = transactionSearchResult.data.Exception;
					}

					var response = {
						"schemaVersion": 1,
						"label": "API Calls",
						"message": "Success: "+successes+", Client Errors: "+failures+", Server Errors: "+exceptions,
						"color": "red"
					}

					sendResponse(200, response, req, resp, next)

				} else {
					console.log('Error with Transaction Search - num Env API calls by status!')

					sendResponse(400, 'Error with Transaction Search - num Env API calls by status!', req, resp, next)

				}
			})
		} else {
			console.log(tokenErrorMsg)

			sendResponse(400, tokenErrorMsg, req, resp, next)
		}
	});

}

function envAvgResponseTime(options, req, resp, next) {
	console.log('envAvgResponseTime() called');

	lib.init(options.clientId, options.clientSecret, options.apiCentralBaseURL, function(e) {
		if(e.success) {
			lib.envAvgAPIResponseTime(req.params.eid, function(transactionSearchResult) {
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

var envmetrics = APIBuilder.API.extend({
	group: 'webhook',
	path: '/api/envmetrics',
	method: 'GET',
	description: 'API to retrieve Environment API metrics for a shields.io badge',
	parameters: {
		metrictype: {
			type: 'query',
			description: 'Type of metric (envcallmetrics, envavgresptime)',
			optional: false
		},eid: {
			type: 'query',
			description: 'Environment ID',
			optional: false
		}
	},
	action: function (req, resp, next) {

		console.log('envmetrics API called')

		let options = {
		  clientId: config.clientId,
		  clientSecret: config.clientSecret,
		  apiCentralBaseURL: config.apiCentralBaseURL
		}

		switch(req.params.metrictype) {
			case 'envcallmetrics':
				envCallMetrics(options, req, resp, next);
				break;
			case 'envavgresptime':
				envAvgResponseTime(options, req, resp, next);
				break;
			default:
				{
					console.log('Unknown metric type requested');

					sendResponse(400, 'Unknown metric type requested!', req, resp, next)
				}
		}


	}
});

module.exports = envmetrics;
