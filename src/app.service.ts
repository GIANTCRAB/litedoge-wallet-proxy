import { Injectable } from '@nestjs/common';

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
      apiKey: this.configService.get<string>('WALLET_API_KEY'),
    };
    const clientOptions = {
      network: network.type,
      port: network.rpcPort,
      apiKey: this.configService.get<string>('WALLET_API_KEY'),
    };

    this.walletClient = new WalletClient(walletOptions);
    this.client = new NodeClient(clientOptions);
  }

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
            console.log('error retrieving listunspent');
            console.log(err);
          },
        );
      },
      (err) => {
        unspent$.next([]);
        console.log('error executing importaddress');
        console.log(err);
      },
    );

    return unspent$;
  }

  pushTransaction(transactionHex: string) {
    this.client.execute('sendrawtransaction', [transactionHex]);
  }
}
