import { Injectable } from '@nestjs/common';

import { BehaviorSubject } from 'rxjs';

import { NodeClient, WalletClient } from 'bclient';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  private walletOptions = {
    network: 'main',
    port: this.configService.get<number>('WALLET_PORT'),
    apiKey: this.configService.get<string>('WALLET_API_KEY'),
  };
  private clientOptions = {
    network: 'main',
    port: this.configService.get<number>('WALLET_RPCPORT'),
    apiKey: this.configService.get<string>('WALLET_API_KEY'),
  };
  private walletClient = new WalletClient(this.walletOptions);
  private client = new NodeClient(this.clientOptions);

  getUnspent(address: string): BehaviorSubject<any> {
    const unspent$ = new BehaviorSubject(null);
    this.walletClient.execute('importaddress', [address]).then(
      () => {
        // Execute after import
        this.walletClient.execute('listunspent', [5, 9999999, [address]]).then(
          (result) => {
            unspent$.next(result);
          },
          (err) => {
            unspent$.next([]);
          },
        );
      },
      (err) => {
        unspent$.next([]);
      },
    );

    return unspent$;
  }

  pushTransaction(transactionHex: string) {
    this.client.execute('sendrawtransaction', [transactionHex]);
  }
}
