
require('dotenv').config()

var config = require('nconf');

import { join } from 'path'

config.argv()
   .env()

config.defaults({
  'DOMAIN': 'api.anypayx.com',
  'API_BASE': 'https://api.anypayx.com'
})

export default config 

