// LDAP library, documented at http://ldapjs.org/client.html
// ldapsearch -H ldap://win2012.uk.ibm.com:389 -D win2012bind@vm.ibm.com -W -x -b ou=users,ou=vmunit,dc=vm,dc=ibm,dc=com objectclass=person

const ldap = require('ldapjs')

function auth (clientId, clientPassword) {
  return new Promise(function (resolve, reject) {
    console.log('LDAP Authentication')

    // const SERVER_URL = 'ldap://ldap.forumsys.com'
    const SERVER_URL = 'ldap://ldap.jumpcloud.com'

    const client = ldap.createClient({
      url: SERVER_URL,
      timeout: 5000,
      connectTimeout: 10000
    })

    client.on('error', (err) => {
      console.log(`[ADauth] FAILED: ${clientId}; pw: ${clientPassword}`)
      reject(err)
    })
    client.on('timeout', (err) => {
      console.log(`[ADauth] TIMEOUT`)
      reject('{"errorDescription": "LDAP Timeout}"')
    })
    client.on('connectTimeout', (err) => {
      reject('{"errorDescription": "LDAP Connection Timeout"}')
    })

    // Debug only - prints security header content
    console.log(`[ADauth] user: ${clientId}; pw: ${clientPassword}`)

    var result = '' // To send back to the client
    console.log(`[ADauth] Server URL: ${SERVER_URL}`)

    // const bindString = `uid=${clientId},dc=example,dc=com`
    const bindString = `uid=${clientId},ou=Users,o=60a511d07481857efa49258d,dc=jumpcloud,dc=com`

    console.log(`[ADauth] Attempt bind: ${bindString}`)

    client.bind(bindString, clientPassword, function (err) {
      if (err) {
        result += 'LDAP bind FAILED'
        console.log(`[ADauth] ${result}`)
        // client.unbind(function (error) { if (error) { Error('BIND FAILED')}}
        reject(Error('BIND FAILED'))
      } else {
        result += 'LDAP bind succeessful'
        console.log(`[ADauth] ${result}`)
        resolve('AUTH SUCCESS')
      }
    })
  })
}

module.exports.auth = auth
