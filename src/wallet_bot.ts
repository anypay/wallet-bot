import axios from 'axios'

import * as delay from 'delay'

import { connect, MnemonicWallet, config, log, Wallet } from './'

import { handlers } from './websockets/index'

import { start as server } from './server'

import { listUnpaid } from './invoices'

import { loadWallet } from './simple-wallet/src'

import { shuffle } from './utils'

import { Balance } from './balances'
  
export interface WalletBotOptions {
    seed_phrase: string
    auth_token: string;
    
    http_api_enabled?: boolean;
    websocket_enabled?: boolean;
    websocket_url?: string;
}

export class WalletBot {

    options: WalletBotOptions

    wallet?: Wallet;
  
    constructor(options: WalletBotOptions) {
      this.options = options

      if (!options.seed_phrase) {
        throw new Error('seed_phrase is required')
      }

      if (!options.auth_token) {
        throw new Error('auth_token is required')
      }

      if (this.options.websocket_enabled === undefined) {
        this.options.websocket_enabled = true
      }

    }

    async loadWallet(): Promise<Wallet> {

      if (!this.wallet) {

        const { wallets } = MnemonicWallet.init(this.options.seed_phrase)
  
        this.wallet = await loadWallet(wallets)
      }

      return this.wallet

    }

    async listBalances(): Promise<Balance[]> {

      const wallet = await this.loadWallet()

      return wallet.balances()
    }
  
    async start() {
  
      if (this.options.http_api_enabled) {
        log.info('http_api_enabled')
        server()
      }
  
      if (!this.options.auth_token) {
        log.error(`Please visit https://anypayx.com/dashboard/apps/wallet-bot to get your token`)
        throw new Error('walletbot_auth_token not set in environment variables')
      }
  
      const { wallets } = MnemonicWallet.init(this.options.seed_phrase)
  
      this.wallet = await loadWallet(wallets)

      var socket: WebSocket | null = null;

      if (this.options.websocket_enabled) {
  
        //socket = await connect(this.options.auth_token)

      }

      console.log('Wallet Bot Started -- Listening for Payment Requests to Fulfill')
  
      while (true) {
    
        var length = 0;
    
        try {
    
          let unpaid = await listUnpaid()
    
          length = unpaid.length
        
          for (let invoice of shuffle<any>(unpaid)) {
    
            try {

              const url = `${config.get('api_base')}/r/${invoice.uid}`
    
              const { data: options } = await axios.get(url, {
                headers: {
                  'Accept': 'application/payment-options',
                  'X-Paypro-Version': 2
                }
              })
    
              if (options.paymentOptions.length > 1) {
    
                const result = await cancelPaymentRequest(invoice.uid, this.options.auth_token)
    
                log.info('payment-request.cancelled', result)
    
                continue;
              }
    
              const currency = options.paymentOptions[0].currency
    
              if (currency === 'XMR') {
    
                const result = await cancelPaymentRequest(invoice.uid, this.options.auth_token)
    
                log.info('payment-request.cancelled', result)
    
                continue;
                
              }
    
              log.info('invoice.pay', options.paymentOptions[0])
    
              let result = await this.wallet.payUri(`${config.get('api_base')}/r/${invoice.uid}`, currency)
    
              log.info('wallet.payInvoice.result', { uid: invoice.uid, result })

              if (this.options.websocket_enabled && socket) {

                handlers.list_balances(socket, {})
              }              
    
            } catch(error) {

              log.error('wallet.payInvoice.error', error)
    
              /*const result = await cancelPaymentRequest(invoice.uid, token)
    
              log.info('payment-request.cancelled', result)*/
    
            }
    
          }
        
        } catch(error) {
    
          log.error(error)
    
        }
    
        await delay(length > 0 ? 5 : 5200)
    
      }
    
    
    }
  
    stop() {
  
    }
  }


async function cancelPaymentRequest(uid: string, token: string): Promise<any> {

    const { data } = await axios.delete(`${config.get('api_base')}/r/${uid}`, {
      auth: {
        username: token,
        password: ''
      }
    }) 
  
    return data
  }