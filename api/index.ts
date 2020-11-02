import { NowRequest, NowResponse } from '@vercel/node';

export default function rootHandler(req: NowRequest, res: NowResponse) {
  res.status(404).end();
}
