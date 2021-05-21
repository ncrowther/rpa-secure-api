var express = require('express')
var app = express()
const axios = require('axios')
var bodyParser = require('body-parser')
var path = require('path')
const ldap = require('./authentication/ADauth.js')

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
*  This API can be used to invoke RPA AP
* @callback POST_/RPA_API
* @return 201 on success
* @return 400 if header invalid,resource not found,field unexpected or consent mismatch
* @return 500 otherwise of unexpected errors
*/

app.post('/run', function (req, res) {
  console.log('POST RPA API')
  // return app.post('https://localhost:8099/scripts/sales_lead_automation_api?unlockMachine=0&first_name=yy&last_name=yyy&job_title=yy&company=yy&email=yy&phone=66&client_address=66&client_city=66&client_state=66&interest=6&followup=Y')

  const apiKey = req.headers.api_key
  const host = req.query.host
  const script = req.query.script
  const unlockMachine = req.query.unlockMachine

  if (host === undefined) {
    const errorResponse = constructResponse(-1, 'FAIL', 'Missing Host parameter.  For loopback set Host to LOOPBACK')
    console.log(`Response: ${errorResponse}`)
    res.status(400).send(errorResponse)
    return
  }

  if (host.toUpperCase() === 'LOOPBACK') {
    const response = constructResponse(0, 'SUCCESS', 'Loopback OK')
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

    var RPA_URL = host + '/scripts/' + script + '?unlockMachine=' + unlockMachine

    console.log('Calling URL:' + RPA_URL)

    // Move api key from header to body
    req.body.api_key = apiKey

    console.log('Body:' + JSON.stringify(req.body))

    axios
      .post(RPA_URL, req.body)
      .then(postRes => {
        console.log(`Response: ${postRes.status}`)
        console.log(`Response: ${postRes.data}`)
        res.status(202).send(postRes.data)
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

var port = process.env.PORT || 3000
app.listen(port, function () {
  console.log('To view your app, open this link in your browser: http://localhost:' + port)
})
