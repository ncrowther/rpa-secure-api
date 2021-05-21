# Node.js RPA Security Gateway
Security Gateway for IBM RPA API

The Node.js app uses [Express Framework](https://expressjs.com) a

## Before you begin

You'll need a [IBM Cloud account](https://console.ng.bluemix.net/registration/),
 [Git](https://git-scm.com/downloads),
[Cloud Foundry CLI](https://github.com/cloudfoundry/cli#downloads), and [Node](https://nodejs.org/en/) installed.



## Running Instructions (start from Step 2)

**IBM Cloud Cloud Foundry**: [Getting started tutorial for Node.js]
https://cloud.ibm.com/docs/cloud-foundry-public?topic=cloud-foundry-public-getting-started-node

Login to IBM Cloud:

ibmcloud login --sso

Target a Cloud Foundry org and space:

ibmcloud target --cf

From within the get-started-node directory, push your app to IBM Cloud:

ibmcloud cf push
