
import axios from 'axios'

import config from './config'

const base = config.get('api_base') || 'https://api.anypayx.com'

import anypay from './anypay'
import log from './log'

export async function listUnpaid(): Promise<any[]> {

  try {

    const url = `${base}/v1/api/apps/wallet-bot/invoices?status=unpaid`

    let { data } = await axios.get(url, {
      auth: {
        username: config.get('walletbot_auth_token'),
        password: ''
      }
    })
  
    return data.invoices

  } catch(error) {

    log.error('invoices.listUnpaid.error', error)

    return []
  }

}

interface NewInvoice {
  currency: string;
  address: string;
  value: number;
  denomination: string;
}

export async function createInvoice(params: NewInvoice): Promise<any> {

  const { currency, address, denomination, value } = params

  const paymentRequest = await anypay.request([{
    currency,
    to: [{
      address,
      amount: value,
      currency: denomination
    }]
  }])

  return paymentRequest

}
