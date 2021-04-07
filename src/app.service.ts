import { Injectable, Logger } from '@nestjs/common';

import { BehaviorSubject } from 'rxjs';

import { NodeClient, WalletClient, Network } from 'litedoge';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private walletClient;
  private client;

  constructor(private configService: ConfigService) {
    const network = Network.get('main');

    const walletOptions = {
      network: network.type,
      port: network.walletPort,
      timeout: 10000,
      apiKey: this.configService.get<string>('WALLET_API_KEY'),
    };
    const clientOptions = {
      network: network.type,
      port: network.rpcPort,
      timeout: 10000,
      apiKey: this.configService.get<string>('WALLET_API_KEY'),
    };

    this.walletClient = new WalletClient(walletOptions);
    this.client = new NodeClient(clientOptions);

    (async () => {
      Logger.warn('retrieving primary account');
      const primaryId = 'primary';
      const mainAccount = 'default';
      const watchOnlyId = 'watchOnly';
      const wallet = this.walletClient.wallet(primaryId);
      const accountRetrieved = await wallet.getAccount(mainAccount);

      const watchOnlyWallet = this.walletClient.wallet(watchOnlyId);
      if (!watchOnlyWallet) {
        Logger.warn('creating watch only wallet');
        const result = await this.walletClient.createWallet(watchOnlyId, {
          accountKey: accountRetrieved.accountKey,
          witness: false,
          watchOnly: true,
        });
      }
      Logger.warn('selecting watch only wallet');
      await this.walletClient.execute('selectwallet', [watchOnlyId]);
      Logger.warn('watch only process completed');
    })();
  }

  getUnspent(address: string): BehaviorSubject<any> {
    const unspent$ = new BehaviorSubject(null);
    this.client.execute('validateaddress', [address]).then(
      (validationResult) => {
        if (validationResult.isvalid) {
          this.walletClient.execute('importaddress', [address]).then(
            () => {
              // Execute after import
              this.walletClient
                .execute('listreceivedbyaddress', [address])
                .then(
                  (result) => {
                    Logger.warn('amount received by address');
                    Logger.warn(JSON.stringify(result));
                  },
                  (err) => {
                    Logger.warn('error');
                    Logger.warn(err);
                  },
                );
              this.walletClient
                .execute('listunspent', [3, 9999999, [address]])
                .then(
                  (result) => {
                    unspent$.next(result);
                    Logger.warn('results retrieved');
                    Logger.warn(address);
                    Logger.warn(JSON.stringify(result));
                  },
                  (err) => {
                    unspent$.next([]);
                    Logger.error('error retrieving listunspent');
                    Logger.error(err);
                  },
                );
            },
            (err) => {
              unspent$.next([]);
              Logger.error('error executing importaddress');
              Logger.error(err);
            },
          );
        } else {
          unspent$.next([]);
          Logger.error('invalid address');
        }
      },
      (err) => {
        unspent$.next([]);
        Logger.error('error executing validateaddress');
        Logger.error(err);
      },
    );

    return unspent$;
  }

  pushTransaction(transactionHex: string) {
    this.client.execute('sendrawtransaction', [transactionHex]);
  }
}
