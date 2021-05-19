# Amplify Central API Service Shields.io Metrics Service

TL;DR - Use Axway's [**API Builder**](https://docs.axway.com/bundle/API_Builder_4x_allOS_en/page/api_builder.html) to add shields to your [**Amplify Central**](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/index.html) API Service Description as follows:

![](https://i.imgur.com/vdZew0J.png)

> Note that this works for *newly* discovered API's and not for existing APIs that have been discovered.

This API Builder project exposes two API's:
* /api/intwebhook - triggered by Amplify Central Integration Webhook for when a **new** API Service is discovered by a discovery agent. This webhook adds three shields to the description. Each shield points to the metrics webhook
* /api/metrics - called by the shields to retrieve total number of api calls, error rate and average response time

This project uses 3 external node modules as follows:

* For HTTP API Calls to Central:
  * npm install --save axios
  * npm install --save qs
* To format total number of API Calls (using K, M, ...)
  * npm install --save short-number

## Environment Variables

Set the following environment variable to run the API Builder project:

* **AC_SA_CLIENTID** - Amplify Central Service Account Client ID for Central API calls
* **AC_SA_CLIENTSECRET** - Amplify Central Service Account Client Secret for Central API calls
* **AC_BASEURL** - Amplify Central Base URL (e.g. https://apicentral.axway.com)
* **APIB_HOST** - host address of API Builder (e.g. 75dd...b22e1f2fa08d9cb6084a9.cloudapp-enterprise.appcelerator.com)

## Docker Build Command

Use the following command to create a docker image of your API Builder project:

`docker build --tag shieldstest ./`

> Note that I had to change the first line of the Dockerfile from `FROM node:12-alpine` to `FROM --platform=linux/x86-64 node:12-alpine` since I was creating on an M1 Macbook. Also, my image is called shieldstest

## Run Commands

```
AC_SA_CLIENTID=<YOUR CLIENT ID> AC_SA_CLIENTSECRET=<YOUR CLIENT SECRET> AC_BASEURL=https://apicentral.axway.com APIB_HOST=23cfbb7e5354.ngrok.io npm start
```

Or, if you create a docker image:

```
docker run --rm -e AC_SA_CLIENTID=<YOUR CLIENT ID> -e AC_SA_CLIENTSECRET=<YOUR CLIENT SECRET> AC_BASEURL=https://apicentral.axway.com -e APIB_HOST=23cfbb7e5354.ngrok.io -e PORT=8080 -p 8080:8080 --name shieldstest shieldstest
```

> Note: the Amplify Central Client ID and Client Secret referenced above are described [here](https://devblog.axway.com/apis/amplify-central-connected-gateway-custom-api-subscription-flow-basics/)

> Note that I am using [ngrok](https://ngrok.com/) so that my API Builder project is accessible remotely

## Deploy to Amplify ARS

ARS does not provide a URL for your deployed API Builder app until you publish so we will setup the app, publish and then modify an environment variable (with the API Builder URL). This will cause the app to restart.

* Use the following Axway CLI commands to create your ARS app:

  ```
  axway acs login
  axway acs new shieldstest --force
  axway acs config --set PORT=8080 shieldstest
  axway acs config --set AC_SA_CLIENTID=<YOUR CLIENT ID> shieldstest
  axway acs config --set AC_SA_CLIENTSECRET=<YOUR CLIENT SECRET> shieldstest
  axway acs config --set AC_BASEURL=https://apicentral.axway.com shieldstest
  axway acs config --set APIB_HOST=<ANY TEXT> shieldstest
  axway acs config --env shieldstest
  axway acs server --set Medium shieldstest
  ```

  > Note that my ARS app is called shieldstest. Also, you need to install the acs package in your Axway CLI

* Publish your API Builder Docker image:

  `axway acs publish shieldstest --delete_oldest --force --image shieldstest --app_version 0.1`

* Update Environment Var

  After publishing, update the APIB_HOST to the base address of the published app (which is provided as output of the prior CLI publish command):

  `axway acs config --set APIB_HOST=c9407........ab145eb0.cloudapp-enterprise.appcelerator.com shieldstest`

## Setup Amplify Central Integration Webhooks

In order for this app to work, it needs to be triggered by an Amplify Central Integration Webhook when a new API Service is discovered by the Discovery Agent. Here are sample CURL commands for setting up such a webhook:

* Get an access token as described [**here**](https://devblog.axway.com/apis/amplify-central-connected-gateway-custom-api-subscription-flow-basics/):

  ```
  curl --location --request POST 'https://login.axway.com/auth/realms/Broker/protocol/openid-connect/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --header 'Authorization: Basic <<<REPLACE WITH YOUR BASE64 ENCODED ID AND SECRET>>>' \
  --data-urlencode 'grant_type=client_credentials'
  ```

* Create an Integration:

  ```
  curl --location --request POST 'https://apicentral.axway.com/apis/management/v1alpha1/integrations' --header 'Content-Type: application/json' --header 'Authorization: Bearer <ACCESS TOKEN>' --data-raw '{
    "name": "apiscintegration",
    "title": "API Service Created Integration",
    "tags": [
        "cloud"
    ],
    "attributes": {},
    "spec": {
        "description": "This is an Integration for when an API Service is created."
    }
  }'
  ```

  > Note: use access_token from the first API Call

* Create an Integration Webhook :

  ```
  curl --location --request POST 'https://apicentral.axway.com/apis/management/v1alpha1/integrations/apiscintegration/webhooks' --header 'Content-Type: application/json' --header 'Authorization: Bearer <ACCESS TOKEN>' --data-raw '{
    "name": "apiscwebhook",
    "title": "API Service Created Webhook to invoke an API Builder API",
    "tags": [
        "prod",
        "saas",
        "axway"
    ],
    "attributes": {
        "release": "1.0.0"
    },
    "spec": {
        "enabled": true,
        "url": "https://23cfbb7e5354.ngrok.io/api/intwebhook"
    }
  }'
  ```

  > Note that the url above is the URL of the API Builder API so the API Builder project must be deployed/running before setting up the Integration

* Create a Resource Hook

  ```
  curl --location --request POST 'https://apicentral.axway.com/apis/management/v1alpha1/integrations/apiscintegration/resourcehooks/' --header 'Content-Type: application/json' --header 'Authorization: Bearer <ACCESS TOKEN>' --data-raw '{
   "group": "management",
   "apiVersion": "v1alpha1",
   "kind": "ResourceHook",
   "name": "apisc-hook",
   "title": "Resource Hook to monitor environment aws and new API Service created",
   "metadata": {
      "scope": {
         "kind": "Integration",
         "name": "apiscintegration"
      }
   },
   "spec": {
      "triggers": [
         {
            "group": "management",
            "kind": "APIService",
            "name": "*",
            "type": [
               "created"
            ],
            "scope": {
               "kind": "Environment",
               "name": "aws"
            }
         }
      ],
      "webhooks": [
         "apiscwebhook"
      ]
   }
  }'
  ```

  > Note that the scope for the resource hook is my aws environment. You can replace with your environment name or use an asterisk '*' for all environments
