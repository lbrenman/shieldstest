![](https://img.shields.io/github/downloads/lbrenman/shieldstest/total?logo=github)

# Amplify Central API Service Shields.io Metrics Service

TL;DR - Use Axway's [**API Builder**](https://docs.axway.com/bundle/API_Builder_4x_allOS_en/page/api_builder.html) to add shields to your [**Amplify Central**](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/index.html) API Service Description as follows:

![](https://i.imgur.com/vdZew0J.png)

Refer to this [blog post](https://gist.github.com/lbrenman/37eec4598cfc6b5ee780b2d09ffc79a6) for more details.

This API Builder project exposes two API's:
* /api/intwebhook - triggered by Amplify Central Integration Webhook for when a **new** API Service is discovered by a discovery agent. This webhook adds three shields to the description. Each shield points to the metrics webhook
* /api/metrics - called by the shields to retrieve total number of api calls, error rate and average response time

> Note that if you have previously discovered API Services, you can manually add the shields URLs to your API Service description using the [Axway CLI](https://docs.axway.com/bundle/Axway_CLI_allOS_en/page/axway_cli.html) or Axway Central API's.

If you want to try this out without buidling the API Builder project, you can pull a docker image from [**Dockerhub**](https://hub.docker.com/r/lbrenman/shieldstest).

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

You can deploy this docker container anywhere that you'd like.

## Deploy to Amplify ARS

[Amplify ARS](https://docs.axway.com/bundle/AMPLIFY_Runtime_Services_2_0_allOS_en/page/amplify_runtime_services_guide.html) provides a URL for your API Builder app as soon as you create the ARS app (before you publish) so we will create the app and grab the URL so we can set the APIB_HOST environment variable before publishing.

> Note that my ARS app is called shieldstest. Also, you need to install the acs package in your Axway CLI

* If you have not already done so, use the following command to create a docker image of your API Builder project:

`docker build --tag shieldstest ./`

* Use the following Axway CLI commands to create your ARS app:

  ```
  axway acs login
  axway acs new shieldstest --force
  ```

* Check the URL

  ```
  axway acs list shieldstest
  ```

  The response will be similar to the following:

  ```
  AXWAY CLI, version 2.1.0
  Copyright (c) 2018-2021, Axway, Inc. All Rights Reserved.

  ACS: Axway AMPLIFY Runtime Services Services Command-Line Interface, version 2.1.10
  Copyright (c) 2012-2021, Axway, Inc.  All Rights Reserved.

  Organization: Axway Appcelerator SE (100000142)
  ============
  Points:
   -- Quota: 1000
   -- Used: 258

  App name: shieldstest
   -- Created by: lbrenman@appcelerator.com
   -- URL: https://843d22.....fa16ceabc.cloudapp-enterprise.appcelerator.com
   -- Created at: 2021-05-18T11:28:14-04:00
   -- Status: To be published
  ```

* Continue to setup the app by setting environment variables:

  ```
  axway acs config --set PORT=8080 shieldstest
  axway acs config --set AC_SA_CLIENTID=<YOUR CLIENT ID> shieldstest
  axway acs config --set AC_SA_CLIENTSECRET=<YOUR CLIENT SECRET> shieldstest
  axway acs config --set AC_BASEURL=https://apicentral.axway.com shieldstest
  axway acs config --set APIB_HOST=<Your ARS App URL> shieldstest
  ```

* Check your environment variables:

  ```
  axway acs config --env shieldstest
  axway acs server --set Medium shieldstest
  ```

* Publish your API Builder Docker image:

  ```
  axway acs publish shieldstest --delete_oldest --force --image shieldstest --app_version 0.1
  ```

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

  ## Setup Amplify Central Integration Webhooks

  In order for this app to work, it needs to be triggered by an Amplify Central Integration Webhook when a new API Service is discovered by the Discovery Agent.

  You can do this using the [**Axway CLI**](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/cli_central/cli_install/index.html#install-axway-cli-and-axway-central-cli) as follows:

  1. Create a YAML file, *resources.yaml*, as follows:

    ```
    name: apiscintegration
    kind: Integration
    apiVersion: v1alpha1
    title: API Service Created Integration
    tags:
    - cloud
    spec:
        description: This is an Integration for when an API Service is created.
    ---
    name: apiscwebhook
    kind: Webhook
    apiVersion: v1alpha1
    title: API Service Created Webhook to invoke an API Builder API
    metadata:
      scope:
        kind: Integration
        name: apiscintegration
    spec:
        enabled: true
        url: https://23cfbb7e5354.ngrok.io/api/intwebhook
    ---
    group: management
    apiVersion: v1alpha1
    kind: ResourceHook
    name: apisc-hook
    title: Resource Hook to monitor environment aws and new API Service created
    metadata:
      scope:
        kind: Integration
        name: apiscintegration
    spec:
      triggers:
        - group: management
          kind: APIService
          name: '*'
          type:
            - created
          scope:
            kind: Environment
            name: aws
      webhooks:
        - apiscwebhook
    ```

    > Note that the url above is the URL of the API Builder API so the API Builder project must be deployed/running before setting up the Integration. Replace with the URL of your container.

    > Note that the scope for the resource hook is my aws environment. You can replace with your environment name or use an asterisk '*' for all environments

  2. Run the following Axway CLI commands to authenticate using your platform credentials and to create the Integration Webhook resources:

    ```
    axway auth login
    axway central create -f resources.yaml
    ```

    The response will be something like this:

    ```
    ⠋ Creating resource(s)(node:96292) ExperimentalWarning: The fs.promises API is experimental
    ✔ "integration/apiscintegration" has successfully been created.
    ✔ "webhook/apiscwebhook" has successfully been created.
    ✔ "resourcehook/apisc-hook" has successfully been created.
    ```

    If you need to make a change to your YAML file, say to update the URL of the webhook, for example, you can use the following command to update the resources:

    ```
    axway central apply -f resources.yaml
    ```
