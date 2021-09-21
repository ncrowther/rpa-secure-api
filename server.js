var express = require('express')
var app = express()
const axios = require('axios')
var bodyParser = require('body-parser')
var path = require('path')
var HashMap = require('hashmap')
const { v4: uuidv4 } = require('uuid')
const ldap = require('./authentication/ADauth.js')

const INVOKE = 'INVOKE'
const RETRIEVE = 'RETRIEVE'

const responseMap = new HashMap()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// app.use(express.static(__dirname + '/views'))
app.use(express.static(path.join(__dirname, '/views')))

function constructResponse (code, type, desc) {
  // Function to return all possible responses following a write to the DB
  const response = {
    out_code: code,
    out_type: type,
    out_message: desc
  }
  return response
}

app.get('/api', function (req, res) {
  console.log('GET RPA API')
  res.send('OK')
})

/**
*  This API can be used to invoke the RPA API with LDAP authentication
* @callback POST_/RPA_API
* @return 201 on success
* @return 400 if header invalid,resource not found,field unexpected or consent mismatch
* @return 500 otherwise of unexpected errors
*/
app.post('/runsync', function (req, res) {
  console.log('POST RPA API')

  const apiKey = req.headers.api_key
  const rpaAgentUrl = req.query.rpaAgentUrl
  const script = req.query.script
  const unlockMachine = req.query.unlockMachine

  if (rpaAgentUrl === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing rpaAgentUrl parameter.  For loopback set rpaAgentUrl to LOOPBACK')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if (rpaAgentUrl.toUpperCase() === 'LOOPBACK') {
    const response = constructResponse(0, 'SUCCESS', 'OK')
    console.log(`Response: ${response}`)
    res.status(200).send(response)
    return
  }

  if (script === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing Script parameter')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if (unlockMachine === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing UnlockMachine parameter.  Should be True or False')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  const basicAuthData = req.headers.authorization.split(' ')[1]
  const buff = Buffer.from(basicAuthData, 'base64')
  const basicAuthText = buff.toString('ascii')

  console.log('"' + basicAuthData + '" converted from Base64 to ASCII is "' + basicAuthText + '"')

  const clientId = basicAuthText.split(':')[0]
  const password = basicAuthText.split(':')[1]

  ldap.auth(clientId, password).then(function (result) {
    console.log('[Main] Authorized ok')

    var rpaUrl = rpaAgentUrl + '/scripts/' + script + '?unlockMachine=' + unlockMachine

    console.log('Calling URL:' + rpaUrl)

    // Move api key from header to body
    req.body.api_key = apiKey

    console.log('Body:' + JSON.stringify(req.body))

    axios
      .post(rpaUrl, req.body)
      .then(postRes => {
        console.log(`Response: ${postRes.status}`)
        console.log(`Response: ${postRes.data}`)
        res.status(200).send(postRes.data)
      })
      .catch(error => {
        console.error(error)

        const response = constructResponse(-1, 'FAIL', error)
        console.log(`Response: ${response}`)
        res.status(404).send(response)
      })
  }).catch(function (ldaperror) {
    const err = `LDAP error:  ${ldaperror}`
    console.log(err)
    res.setHeader('Content-Type', 'application/json')
    res.status(401)
    res.send(err)
  })
})

/**
* This API invokes the RPA API AYNCRHONOUSLY.  The first parameter MODE indicates whether the call is INVOKE or RETRIEVE
* @callback POST_/RPA_API
* @return 201 on success
* @return 400 if header invalid,resource not found,field unexpected or consent mismatch
* @return 500 otherwise of unexpected errors
*/
app.post('/runasync', function (req, res) {
  console.log('POST ASYNC RPA API')

  // Query params
  const apiKey = req.headers.api_key
  const rpaAgentUrl = req.query.rpaAgentUrl
  const script = req.query.script
  const unlockMachine = req.query.unlockMachine
  const mode = req.query.mode

  // Body params
  // const mode = req.body.mode
  const requestId = req.body.requestId

  console.log(`Script: ${script}`)
  console.log(`Mode: ${mode}`)
  console.log(`RequestId: ${requestId}`)

  if (mode === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing Mode parameter.  Mode should be either INVOKE or RETRIEVE')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if (mode !== RETRIEVE && mode !== INVOKE) {
    const errorResponse = constructResponse(-1, 'FAIL', `Invalid Mode parameter ''${mode}'. Should be either INVOKE or RETRIEVE`)
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if (rpaAgentUrl === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing rpaAgentUrl parameter.  For loopback set rpaAgentUrl to LOOPBACK')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if ((rpaAgentUrl.toUpperCase() === 'LOOPBACK') && (mode === INVOKE)) {
    const response = constructResponse(0, 'PENDING', 'Pending bot completion')
    console.log(`Response: ${response}`)
    res.status(202).send(response)
    return
  }

  if (script === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing Script parameter')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if (unlockMachine === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing UnlockMachine parameter.  Should be True or False')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  const basicAuthData = req.headers.authorization.split(' ')[1]
  const buff = Buffer.from(basicAuthData, 'base64')
  const basicAuthText = buff.toString('ascii')

  console.log('"' + basicAuthData + '" converted from Base64 to ASCII is "' + basicAuthText + '"')

  const clientId = basicAuthText.split(':')[0]
  const password = basicAuthText.split(':')[1]

  ldap.auth(clientId, password).then(function (result) {
    console.log('[Main] Authorized ok')

    if (mode === RETRIEVE) {
      processRetrieve(requestId, res)
    } else { // INVOKE
      var rpaUrl = rpaAgentUrl + '/scripts/' + script + '?unlockMachine=' + unlockMachine
      processRequest(req, res, apiKey, rpaUrl)
    }
  }).catch(function (ldaperror) {
    const err = `LDAP error:  ${ldaperror}`
    console.log(err)
    const response = constructResponse(-1, 'FAIL', 'LDAP auth error')
    res.setHeader('Content-Type', 'application/json')
    res.status(401)
    res.send(response)
  })
})

var port = process.env.PORT || 3000
app.listen(port, function () {
  console.log('To view your app, open this link in your browser: http://localhost:' + port)
})

function processRequest (req, res, apiKey, rpaUrl) {
  console.log('Calling URL:' + rpaUrl)

  // Move api key from header to body
  req.body.api_key = apiKey

  console.log('Body:' + JSON.stringify(req.body))

  const id = uuidv4()
  const response = constructResponse(0, 'PENDING', id)
  responseMap.set(id, response)
  res.status(202).send(response)

  axios
    .post(rpaUrl, req.body)
    .then(postRes => {
      console.log(`RPA Response: ${postRes.status}`)

      var response = postRes.data

      responseMap.set(id, response)
    })
    .catch(error => {
      console.error(error)

      const response = constructResponse(-1, 'FAIL', error)
      console.log(`Response: ${response}`)
      responseMap.set(id, response)
    })
}

function processRetrieve (requestId, res) {
  // Return the result from the INVOKE

  if (requestId === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Mode is RETRIEVE.  Expected requestId.')
    console.log(`Error response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  const response = responseMap.get(requestId)

  console.log(`Response: ${response}`)

  if (response === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'No response associated to supplied request id.')
    console.log(`Error response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if (response.out_code === '0') {
    console.log(`Success response: ${response.out_code}`)
    res.status(200).send(response)
  } else {
    // Bad Request
    console.log(`Failure response: ${response.out_code}`)
    res.status(400).send(response)
  }
}
