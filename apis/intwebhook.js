var APIBuilder = require('@axway/api-builder-runtime');

let lib = require('../aclib');
let config = require('../acconfig');

let baseAddress = process.env.APIB_HOST; // Base address of API Builder APIs

var intwebhook = APIBuilder.API.extend({
	group: 'webhook',
	path: '/api/intwebhook',
	method: 'POST',
	description: 'Central Integration Webhook to detect new API Service and add metrics shields to the API Service description',
	parameters: {
		id: {description:'id'},
		time: {description:'time'},
		version: {description:'version'},
		product: {description:'product'},
		correlationId: {description:'correlationId'},
		organization: {description:'organization object'},
		type: {description:'type'},
		payload: {description:'payload object'},
		metadata: {description:'metadata object'}
	},
	action: function (req, resp, next) {

		console.log('intwebhook called')

		let options = {
		  clientId: config.clientId,
		  clientSecret: config.clientSecret,
		  apiCentralBaseURL: config.apiCentralBaseURL
		}

		let payload = req.body.payload;

		let url = '/apis'+payload.metadata.selfLink;
		let data = payload;
		// let shieldsURL = 'https://img.shields.io/endpoint?style=social&url=https%3A%2F%2F23cfbb7e5354.ngrok.io%2Fapi%2Fmetricstotalcalls%3Feid%3D'+data.metadata.scope.id+'%26pid%3D'+'remoteApiId_'+data.attributes.externalAPIID
		let totalCallsShieldsURL = 'https://img.shields.io/endpoint?style=social&url=https%3A%2F%2F'+baseAddress+'%2Fapi%2Fmetrics%3Fmetrictype%3Dtotalnumcalls%26eid%3D'+data.metadata.scope.id+'%26pid%3DremoteApiId_'+data.attributes.externalAPIID
		let avgResponseTimeShieldsURL = 'https://img.shields.io/endpoint?url=https%3A%2F%2F'+baseAddress+'%2Fapi%2Fmetrics%3Fmetrictype%3Davgresptime%26eid%3D'+data.metadata.scope.id+'%26pid%3DremoteApiId_'+data.attributes.externalAPIID
		let errorRateShieldsURL = 'https://img.shields.io/endpoint?url=https%3A%2F%2F'+baseAddress+'%2Fapi%2Fmetrics%3Fmetrictype%3Derrorrate%26eid%3D'+data.metadata.scope.id+'%26pid%3DremoteApiId_'+data.attributes.externalAPIID
		data.spec.description = '![]('+totalCallsShieldsURL+')  ' + '![]('+errorRateShieldsURL+')  ' + '![]('+avgResponseTimeShieldsURL+')\n\n' + data.spec.description;

		lib.init(options.clientId, options.clientSecret, options.apiCentralBaseURL, function(e) {
	    if(e.success) {
				console.log('Central authentication successful')
	      lib.updateAPIService(url, data, function(updatedAPIService) {
	        if(updatedAPIService.success) {
	          console.log('API Service properly updated')
	        } else {
	          console.log('Error updating API Service!')
	        }
	      })
	    } else {
	      console.log(tokenErrorMsg)
	    }
	  });

		resp.response.status(200);
  	resp.send('Success!!!');
  	next();

	}
});

module.exports = intwebhook;
