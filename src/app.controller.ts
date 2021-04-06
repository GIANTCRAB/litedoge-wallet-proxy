import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/addresses/:id/unspent')
  getUnspent(@Req() req: Request, @Res() res: Response) {
    const unspent$ = this.appService.getUnspent(req.params.id);
    unspent$.subscribe((result) => {
      if (result) {
        unspent$.complete();

        res.json({ data: result, msg: 'Unspent transactions' });
      }
    });
  }

  @Post('/transactions')
  postTransaction(@Req() req: Request, @Res() res: Response) {
    this.appService.pushTransaction(req.body.transactionData);

    res.json({ msg: 'Transaction pushed' });
  }
}
